import { motion } from 'framer-motion';

const ThinkingAnimation = () => {
  return (
    <div className="chat chat-start">
      <div className="prose max-w-none prose-compact prose-sm shadow-sm prose-p:my-0 prose-li:my-0 prose-li:py-0 prose-ul:my-0 prose-ul:py-1 prose-pre:my-0 text-sm leading-tighter rounded-xl px-4 py-3 text-base-content border border-base-300 bg-base-100/70">
        <div className="flex items-center space-x-1">
          <span className="opacity-70 text-xs mr-2">AI is thinking</span>
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="w-2 h-2 bg-primary/50 rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: index * 0.2,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ThinkingAnimation;
