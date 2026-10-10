import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useScreenShare } from '@/hooks/useScreenShare';
import { useMediaRecorder } from '@/hooks/useMediaRecorder';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, VideoOff, Mic, MicOff, Monitor, Square, Phone, PhoneOff, Play, Copy, Check, User } from 'lucide-react';
import { toast } from 'sonner';
import { copyCallLink } from '@/lib/callLink';
import { BACKEND_URL } from '@/lib/media';

interface VideoCallProps {
  roomId: string;
  participantId?: string;
  onClose: () => void;
}

const VideoCall: React.FC<VideoCallProps> = ({ roomId, onClose }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [copied, setCopied] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  const {
    localStream,
    remoteStreams,
    isConnected,
    participants,
    localVideoRef,
    startLocalStream,
    joinRoom,
    leaveRoom,
  } = useWebRTC({ socket, roomId });

  // console.log('VideoCall render - localStream:', localStream, 'isConnected:', isConnected);

  const {
    isSharing,
    screenStream,
    screenVideoRef,
    startScreenShare,
    stopScreenShare,
  } = useScreenShare({ socket, roomId });

  const { isRecording, startRecording, stopRecording } = useMediaRecorder({
    socket,
    roomId,
    stream: localStream,
  });

  useEffect(() => {
    const newSocket = io(BACKEND_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setSocketConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setSocketConnected(false);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socket && socketConnected && roomId && !hasJoined) {
      startLocalStream().then(() => {
        joinRoom();
        setHasJoined(true);
      });
    }
  }, [socket, socketConnected, roomId, hasJoined, startLocalStream, joinRoom]);

  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track: { enabled: boolean; }) => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const handleEndCall = () => {
    leaveRoom();
    onClose();
  };

  const copyRoomId = async () => {
    await copyCallLink(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <Card className="w-full max-w-6xl h-full max-h-screen bg-gray-900 text-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Video Call - Room: {roomId}</CardTitle>
          <Button onClick={copyRoomId} variant="outline" size="sm" className="flex items-center gap-2">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Share Link'}
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col h-50%t ">
          <div className="flex-1 flex gap-4 mb-4">
            {/* Remote Videos - Left side, wider */}
            <div className="flex-1 flex flex-col gap-4">
              {Array.from(remoteStreams.entries()).map(([peerId, stream]) => {
                const hasVideo = stream.getVideoTracks().length > 0;
                return (
                  <div key={peerId} className="relative bg-gray-800 rounded-lg overflow-hidden flex-1">
                    {hasVideo ? (
                      <>
                        <video
                          autoPlay
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                          ref={(el) => {
                            if (el && el.srcObject !== stream) {
                              console.log('Setting remote video srcObject for peer:', peerId, 'stream:', stream);
                              el.srcObject = stream;
                              el.play().catch(e => console.log('Remote video play failed for peer:', peerId, e));
                            }
                          }}
                          onLoadedData={() => console.log('Remote video loaded for peer:', peerId)}
                          onError={(e) => console.log('Remote video error for peer:', peerId, e)}
                        />
                        <audio
                          autoPlay
                          ref={(el) => {
                            if (el && el.srcObject !== stream) {
                              el.srcObject = stream;
                            }
                          }}
                        />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-700">
                        <div className="text-center">
                          <VideoOff className="w-16 h-16 mx-auto mb-2 text-gray-400" />
                          <p className="text-gray-400">Friend's camera is off</p>
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded">
                      Friend {peerId.slice(0, 8)}
                    </div>
                  </div>
                );
              })}

              {/* Screen Share */}
              {isSharing && (
                <div className="relative bg-gray-800 rounded-lg overflow-hidden flex-1">
                  <video
                    ref={screenVideoRef}
                    autoPlay
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded">
                    Screen Share
                  </div>
                </div>
              )}

              {/* Placeholder if no remote videos */}
              {remoteStreams.size === 0 && !isSharing && (
                <div className="flex-1 bg-gray-800 rounded-lg flex items-center justify-center">
                  <p className="text-gray-400">Waiting for friends to join...</p>
                </div>
              )}
            </div>

            {/* Local Video - Right side */}
            <div className="flex-1 relative bg-gray-800 rounded-lg overflow-hidden">
              <video
                key="local-video"
                ref={(el) => {
                  if (el && el !== localVideoRef.current) {
                    console.log('Local video ref set:', el);
                    localVideoRef.current = el;
                    // Set srcObject immediately when element is available
                    if (localStream && el.srcObject !== localStream) {
                      el.srcObject = localStream;
                      el.play().catch(e => console.log('Local video play failed:', e));
                    }
                  }
                }}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                onLoadedData={() => console.log('Local video loaded')}
                onError={(e) => console.log('Local video error:', e)}
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded">
                You ({participants.length} participants)
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center space-x-4">
            <Button
              onClick={toggleVideo}
              variant={isVideoEnabled ? "default" : "destructive"}
              size="lg"
            >
              {isVideoEnabled ? <Video /> : <VideoOff />}
            </Button>
            <Button
              onClick={toggleAudio}
              variant={isAudioEnabled ? "default" : "destructive"}
              size="lg"
            >
              {isAudioEnabled ? <Mic /> : <MicOff />}
            </Button>
            <Button
              onClick={isSharing ? stopScreenShare : startScreenShare}
              variant={isSharing ? "destructive" : "default"}
              size="lg"
            >
              <Monitor />
            </Button>
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              variant={isRecording ? "destructive" : "default"}
              size="lg"
            >
              {isRecording ? <Square /> : <Video />}
            </Button>
            <Button onClick={handleEndCall} variant="destructive" size="lg">
              <PhoneOff />
            </Button>
          </div>



          <div className="text-center mt-4">
            <p className="text-sm text-gray-400">
              {isConnected ? 'Connected' : 'Connecting...'} | Participants: {participants.length}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default React.memo(VideoCall);
