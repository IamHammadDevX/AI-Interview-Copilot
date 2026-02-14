import { motion } from 'framer-motion';

const TranscribingAnimation = () => {
  return (
    <div className="chat chat-end">
      <div className="bg-primary text-white font-medium border border-primary prose prose-invert max-w-none prose-compact prose-sm shadow-sm prose-p:my-0 prose-li:my-0 prose-li:py-0 prose-ul:my-0 prose-ul:py-1 prose-pre:my-0 text-sm leading-tighter rounded-xl px-4 py-3">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                className="w-1.5 h-1.5 bg-white/70 rounded-full"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: index * 0.15,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranscribingAnimation;
