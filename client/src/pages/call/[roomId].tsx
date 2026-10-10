import { useRouter } from 'next/router';
import VideoCall from '@/components/VideoCall';

const CallPage = () => {
  const router = useRouter();
  const { roomId, participant } = router.query;

  if (!roomId || typeof roomId !== 'string') {
    return <div>Loading...</div>;
  }

  return <VideoCall roomId={roomId} participantId={participant as string} onClose={() => router.push('/')} />;
};

export default CallPage;
