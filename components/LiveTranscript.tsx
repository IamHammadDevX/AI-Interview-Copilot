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
    <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
      <div className="flex items-center justify-between p-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              recording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'
            }`}
          />
          <span className="text-xs font-medium text-gray-700">
            {recording ? 'Live' : 'Transcript'}
          </span>
        </div>
        {transcript && (
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {transcript.split(' ').filter((word) => word.trim()).length}w
          </span>
        )}
      </div>

      <div className="p-2 overflow-y-scroll max-h-[330px]">
        <div className="h-full p-2 rounded text-xs ">
          <div className="text-gray-800 leading-relaxed whitespace-pre-wrap h-full">
            {transcript}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTranscript;
