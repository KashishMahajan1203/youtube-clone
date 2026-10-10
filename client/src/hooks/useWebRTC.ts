import { useRef, useState, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';

interface UseWebRTCProps {
  socket: Socket | null;
  roomId: string;
}

interface JoinRoomResponse {
  success: boolean;
  participants: string[];
  error?: string;
}

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
  const srcObjectSetRef = useRef<boolean>(false);
  const localStreamRef = useRef<MediaStream | null>(null);

  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  const createPeerConnection = useCallback((peerId: string) => {
    // Check if connection already exists
    if (peerConnectionsRef.current.has(peerId)) {
      return peerConnectionsRef.current.get(peerId)!;
    }

    const pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', {
          roomId,
          candidate: event.candidate,
          from: socket.id,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('Received remote stream for peer:', peerId, 'stream:', event.streams[0], 'tracks:', event.streams[0].getTracks().map(t => t.kind + ':' + t.enabled));
      const remoteStream = event.streams[0];
      console.log('Remote stream id:', remoteStream.id, 'active:', remoteStream.active);

      setRemoteStreams((prev) => {
        const newStreams = new Map(prev);
        newStreams.set(peerId, remoteStream);
        console.log('Updated remoteStreams:', Array.from(newStreams.keys()), 'sizes:', Array.from(newStreams.values()).map(s => s.getTracks().length));
        return newStreams;
      });
    };
 
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        // Clean up failed connections
        peerConnectionsRef.current.delete(peerId);
        setRemoteStreams((prev) => {
          const newStreams = new Map(prev);
          newStreams.delete(peerId);
          return newStreams;
        });
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    peerConnectionsRef.current.set(peerId, pc);
    return pc;
  }, [localStream, socket, roomId, configuration]);

  const createOffer = useCallback(async (peerId: string) => {
    const pc = createPeerConnection(peerId);
    // Allow offer creation in stable state or when we have local offer
    if (pc.signalingState === 'closed' || pc.signalingState === 'have-remote-offer') {
      console.log('Skipping offer creation, signaling state:', pc.signalingState);
      return;
    }

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('Created offer for peer:', peerId, 'signaling state:', pc.signalingState);

      if (socket) {
        socket.emit('offer', { roomId, offer, from: socket.id });
      }
    } catch (error) {
      console.error('Error creating offer for peer:', peerId, error);
    }
  }, [createPeerConnection, socket, roomId]);

  const createAnswer = useCallback(async (peerId: string, offer: RTCSessionDescriptionInit) => {
    const pc = createPeerConnection(peerId);

    try {
      // Handle offer collision (perfect negotiation pattern)
      if (pc.signalingState === 'have-local-offer') {
        // We have a local offer, but received a remote offer - rollback and accept remote offer
        console.log('Offer collision detected for peer:', peerId, '- rolling back local offer');
        await pc.setLocalDescription({ type: 'rollback' });
      }

      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('Created answer for peer:', peerId, 'signaling state:', pc.signalingState);

      if (socket) {
        socket.emit('answer', { roomId, answer, from: socket.id });
      }
    } catch (error) {
      console.error('Error creating answer for peer:', peerId, error);
    }
  }, [createPeerConnection, socket, roomId]);

  const startLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      console.log('Local stream obtained, tracks:', stream.getTracks().map(t => t.kind + ':' + t.enabled));
      setLocalStream(stream);
      localStreamRef.current = stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  }, []);

  const joinRoom = useCallback(async () => {
    if (!socket) return;

    console.log('Joining room:', roomId, 'socket id:', socket.id);
    socket.emit('join-room', roomId, (response: JoinRoomResponse) => {
      console.log('Join room response:', response);
      if (response.success) {
        setParticipants(response.participants);
        setIsConnected(true);
        console.log('Participants:', response.participants);

        // Create offers to all other participants to ensure bidirectional connections
        if (socket.id) {
          response.participants.forEach((peerId: string) => {
            if (peerId !== socket.id && !peerConnectionsRef.current.has(peerId)) {
              console.log('Creating offer to participant:', peerId);
              createOffer(peerId);
            }
          });
        }
      }
    });
  }, [socket, roomId, createOffer]);

  useEffect(() => {
    if (!socket) return;

    socket.on('user-joined', (peerId: string) => {
      console.log('User joined:', peerId);
      setParticipants((prev) => {
        if (!prev.includes(peerId)) {
          return [...prev, peerId];
        }
        return prev;
      });
      // Create offer to the new user if we have local stream
      if (localStream && peerId !== socket.id && socket.id) {
        createOffer(peerId);
      }
    });

    socket.on('user-left', (peerId: string) => {
      setParticipants((prev) => prev.filter(id => id !== peerId));
      setRemoteStreams((prev) => {
        const newStreams = new Map(prev);
        newStreams.delete(peerId);
        return newStreams;
      });
      peerConnectionsRef.current.delete(peerId);
    });

    socket.on('offer', async (data: { offer: RTCSessionDescriptionInit; from: string }) => {
      if (data.from !== socket.id) {
        await createAnswer(data.from, data.offer);
      }
    });

    socket.on('answer', async (data: { answer: RTCSessionDescriptionInit; from: string }) => {
      if (data.from !== socket.id) {
        const pc = peerConnectionsRef.current.get(data.from);
        if (pc && pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(data.answer);
        } else {
          console.log('Skipping answer setRemoteDescription, signaling state:', pc?.signalingState);
        }
      }
    });

    socket.on('ice-candidate', async (data: { candidate: RTCIceCandidateInit; from: string }) => {
      if (data.from !== socket.id) {
        const pc = peerConnectionsRef.current.get(data.from);
        if (pc) {
          await pc.addIceCandidate(data.candidate);
        }
      }
    });

    return () => {
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
    };
  }, [socket, createOffer, createAnswer, localStream]);

  // Add tracks to existing peer connections when localStream becomes available
  useEffect(() => {
    if (localStream) {
      console.log('Local stream available, adding tracks to existing peer connections');
      peerConnectionsRef.current.forEach(async (pc, peerId) => {
        const senders = pc.getSenders();
        const hasVideoTrack = senders.some(sender => sender.track?.kind === 'video');
        const hasAudioTrack = senders.some(sender => sender.track?.kind === 'audio');

        let tracksAdded = false;
        if (!hasVideoTrack || !hasAudioTrack) {
          localStream.getTracks().forEach((track) => {
            const existingSender = senders.find(sender => sender.track?.kind === track.kind);
            if (!existingSender) {
              console.log('Adding track to existing peer connection:', peerId, track.kind);
              pc.addTrack(track, localStream);
              tracksAdded = true;
            }
          });
        }

        // If tracks were added and we're in a stable state, renegotiate
        if (tracksAdded && pc.signalingState === 'stable' && socket) {
          console.log('Renegotiating offer for peer:', peerId);
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('offer', { roomId, offer, from: socket.id });
          } catch (error) {
            console.error('Error renegotiating offer for peer:', peerId, error);
          }
        }
      });
    }
  }, [localStream, socket, roomId]);



  useEffect(() => {
    if (localVideoRef.current && localStream && !srcObjectSetRef.current) {
      // console.log('Setting srcObject in useEffect');
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(e => console.log('Play failed:', e));
      srcObjectSetRef.current = true;
    }
  }, [localStream]);



  const leaveRoom = useCallback(() => {
    if (socket) {
      socket.emit('leave-room', roomId);
    }
    setIsConnected(false);
    setParticipants([]);
    setRemoteStreams(new Map());
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    srcObjectSetRef.current = false;
  }, [socket, roomId, localStream]);

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
