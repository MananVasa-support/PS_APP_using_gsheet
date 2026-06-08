import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiHome } from 'react-icons/fi';
import { Button, Logo } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-auth-radial px-6 text-center">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <p className="font-display text-7xl font-extrabold text-gradient">404</p>
        <h1 className="mt-4 text-2xl font-bold text-white">Page not found</h1>
        <p className="mx-auto mt-2 max-w-sm text-ink-400">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Button as={Link} to="/dashboard" icon={FiHome} size="lg" className="mt-8">
          Back to dashboard
        </Button>
      </motion.div>
    </div>
  );
}
