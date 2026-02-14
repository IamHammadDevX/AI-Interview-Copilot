interface LiveTranscriptProps {
  transcript: string;
  recording: boolean;
  useWebAPI: boolean;
}

const LiveTranscript = ({
  transcript,
  recording,
  useWebAPI,
}: LiveTranscriptProps) => {
  if (!useWebAPI) return null;
  
  return (
    <div className="h-full bg-base-100/80 backdrop-blur rounded-2xl border border-base-300 shadow-sm flex flex-col">
      <div className="flex items-center justify-between p-2 border-b border-base-300">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              recording ? 'bg-red-500 animate-pulse' : 'bg-base-300'
            }`}
          />
          <span className="text-xs font-medium">
            {recording ? 'Live' : 'Transcript'}
          </span>
        </div>
        {transcript && (
          <span className="text-xs opacity-70 bg-base-200/60 px-2 py-0.5 rounded-full border border-base-300">
            {transcript.split(' ').filter((word) => word.trim()).length}w
          </span>
        )}
      </div>

      <div className="p-2 overflow-y-scroll max-h-[330px]">
        <div className="h-full p-2 rounded text-xs ">
          <div className="text-base-content leading-relaxed whitespace-pre-wrap h-full">
            {transcript}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTranscript;
