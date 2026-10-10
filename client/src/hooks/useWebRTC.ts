import { useRef, useState, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';

// STUN lets peers discover their public address; that's enough on most home
// networks. Strict NATs (many offices, some mobile carriers) also need a TURN
// relay — set NEXT_PUBLIC_TURN_URL / _USERNAME / _CREDENTIAL to add one.
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  ...(process.env.NEXT_PUBLIC_TURN_URL
    ? [{
        urls: process.env.NEXT_PUBLIC_TURN_URL.split(',').map((u) => u.trim()),
        username: process.env.NEXT_PUBLIC_TURN_USERNAME,
        credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
      }]
    : []),
];

interface UseWebRTCProps {
  socket: Socket | null;
  roomId: string;
}

interface JoinRoomResponse {
  success: boolean;
  participants: string[];
  error?: string;
}

/*
 * Mesh WebRTC for small calls.
 *
 * Signalling rules (avoid "glare", where both sides offer at once):
 * - A peer that joins sends an offer to everyone already in the room.
 * - Peers already in the room never initiate; they only answer.
 * Every offer/answer/candidate is addressed to one peer (`to`), and ICE
 * candidates that arrive before the remote description are queued.
 */
export const useWebRTC = ({ socket, roomId }: UseWebRTCProps): {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isConnected: boolean;
  participants: string[];
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  startLocalStream: () => Promise<void>;
  joinRoom: () => Promise<void>;
  leaveRoom: () => void;
} => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  const removePeer = useCallback((peerId: string) => {
    peerConnectionsRef.current.get(peerId)?.close();
    peerConnectionsRef.current.delete(peerId);
    pendingCandidatesRef.current.delete(peerId);
    setRemoteStreams((prev) => {
      if (!prev.has(peerId)) return prev;
      const next = new Map(prev);
      next.delete(peerId);
      return next;
    });
  }, []);

  const createPeerConnection = useCallback((peerId: string) => {
    const existing = peerConnectionsRef.current.get(peerId);
    if (existing) return existing;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', { roomId, to: peerId, candidate: event.candidate.toJSON() });
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0] ?? new MediaStream([event.track]);
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.set(peerId, stream);
        return next;
      });
    };

    pc.onconnectionstatechange = () => {
      // "disconnected" can recover on its own; "failed" can't.
      if (pc.connectionState === 'failed') {
        console.warn('WebRTC connection failed with', peerId, '— a TURN server may be needed on this network');
        removePeer(peerId);
      }
    };

    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    } else {
      // No camera/mic (denied or unavailable): still receive the other side.
      pc.addTransceiver('audio', { direction: 'recvonly' });
      pc.addTransceiver('video', { direction: 'recvonly' });
    }

    peerConnectionsRef.current.set(peerId, pc);
    return pc;
  }, [socket, roomId, removePeer]);

  const flushCandidates = async (peerId: string, pc: RTCPeerConnection) => {
    const queued = pendingCandidatesRef.current.get(peerId) ?? [];
    pendingCandidatesRef.current.delete(peerId);
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (error) {
        console.warn('Dropped ICE candidate from', peerId, error);
      }
    }
  };

  const sendOffer = useCallback(async (peerId: string) => {
    if (!socket) return;
    const pc = createPeerConnection(peerId);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('offer', { roomId, to: peerId, offer: pc.localDescription });
    } catch (error) {
      console.error('Error creating offer for', peerId, error);
    }
  }, [socket, roomId, createPeerConnection]);

  const startLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      localStreamRef.current = stream;
    } catch (error) {
      console.error('Error accessing camera/microphone:', error);
      // Try audio only, then carry on receive-only.
      try {
        const audio = await navigator.mediaDevices.getUserMedia({ audio: true });
        setLocalStream(audio);
        localStreamRef.current = audio;
      } catch {
        /* receive-only */
      }
    }
  }, []);

  const joinRoom = useCallback(async () => {
    if (!socket) return;
    socket.emit('join-room', roomId, (response: JoinRoomResponse) => {
      if (!response?.success) return;
      setParticipants(response.participants);
      setIsConnected(true);
      // We're the newcomer: offer to everyone already here.
      response.participants
        .filter((peerId) => peerId !== socket.id)
        .forEach((peerId) => sendOffer(peerId));
    });
  }, [socket, roomId, sendOffer]);

  useEffect(() => {
    if (!socket) return;

    const onUserJoined = (peerId: string) => {
      // The newcomer will send us an offer; just track them.
      setParticipants((prev) => (prev.includes(peerId) ? prev : [...prev, peerId]));
    };

    const onUserLeft = (peerId: string) => {
      setParticipants((prev) => prev.filter((id) => id !== peerId));
      removePeer(peerId);
    };

    const onOffer = async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      if (!from || from === socket.id) return;
      const pc = createPeerConnection(from);
      try {
        await pc.setRemoteDescription(offer);
        await flushCandidates(from, pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { roomId, to: from, answer: pc.localDescription });
      } catch (error) {
        console.error('Error answering offer from', from, error);
      }
    };

    const onAnswer = async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peerConnectionsRef.current.get(from);
      if (!pc || pc.signalingState !== 'have-local-offer') return;
      try {
        await pc.setRemoteDescription(answer);
        await flushCandidates(from, pc);
      } catch (error) {
        console.error('Error applying answer from', from, error);
      }
    };

    const onIceCandidate = async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      if (!candidate) return;
      const pc = peerConnectionsRef.current.get(from);
      if (!pc || !pc.remoteDescription) {
        const queue = pendingCandidatesRef.current.get(from) ?? [];
        queue.push(candidate);
        pendingCandidatesRef.current.set(from, queue);
        return;
      }
      try {
        await pc.addIceCandidate(candidate);
      } catch (error) {
        console.warn('Dropped ICE candidate from', from, error);
      }
    };

    socket.on('user-joined', onUserJoined);
    socket.on('user-left', onUserLeft);
    socket.on('offer', onOffer);
    socket.on('answer', onAnswer);
    socket.on('ice-candidate', onIceCandidate);

    return () => {
      socket.off('user-joined', onUserJoined);
      socket.off('user-left', onUserLeft);
      socket.off('offer', onOffer);
      socket.off('answer', onAnswer);
      socket.off('ice-candidate', onIceCandidate);
    };
  }, [socket, roomId, createPeerConnection, removePeer]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream]);

  const leaveRoom = useCallback(() => {
    if (socket) {
      socket.emit('leave-room', roomId);
    }
    setIsConnected(false);
    setParticipants([]);
    setRemoteStreams(new Map());
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    pendingCandidatesRef.current.clear();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
  }, [socket, roomId]);

  return {
    localStream,
    remoteStreams,
    isConnected,
    participants,
    localVideoRef,
    startLocalStream,
    joinRoom,
    leaveRoom,
  };
};
