import { motion } from 'framer-motion';
import PageTransition from '@/features/reason-eliminator/components/layout/PageTransition.jsx';

// Navigation actions (Start New Assessment, Previous Assessment, Dashboard,
// Grip Test, Reset All Data) now live exclusively in the sidebar. The Home
// screen keeps only the welcome hero — no duplicate center navigation buttons.
export default function HomePage() {
  return (
    <PageTransition className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <img
            src="https://res.cloudinary.com/drwoydou3/image/upload/v1777300803/ChatGPT_Image_Apr_23_2026_11_54_33_PM_km0ken.png"
            alt="Altus Corp logo"
            className="inline-block w-14 h-14 rounded-2xl object-cover mb-5 shadow-card"
          />
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-red mb-2">
            Reasons Eliminator
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-brand-black tracking-tight">
            What is stopping you?
          </h1>
          <p className="mt-3 text-sm md:text-base text-brand-gray-900">
            Capture your Reasons, assess them, and replace each one with a
            Power Word.
          </p>
        </motion.div>
      </div>
    </PageTransition>
  );
}
