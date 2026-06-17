import { FaWhatsapp } from 'react-icons/fa';

/**
 * Permanent floating WhatsApp button (bottom-right of the viewport on every
 * post-login screen). Opens a direct chat to the support number with a clean
 * pre-filled message so the conversation starts with context.
 */
const PHONE = '918097010410'; // +91 80970 10410
const PREFILL = "Hi Manan, I'm using the Productivity Shastra app and had a question regarding ";

export default function WhatsAppFloat() {
  const href = `https://wa.me/${PHONE}?text=${encodeURIComponent(PREFILL)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      title="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-[90] grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30 transition-transform hover:scale-105 active:scale-95"
    >
      <FaWhatsapp className="h-7 w-7" />
    </a>
  );
}
