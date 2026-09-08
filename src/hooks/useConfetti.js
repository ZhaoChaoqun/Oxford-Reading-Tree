import confetti from 'canvas-confetti';
import { useCallback } from 'react';

/**
 * Returns confetti preset functions:
 * burst()     - small burst for correct answer
 * rain()      - longer rain for book complete
 * fireworks() - dramatic burst for perfect quiz
 */
export function useConfetti() {
  const burst = useCallback(() => {
    confetti({
      particleCount: 60,
      spread: 55,
      origin: { y: 0.7 },
      colors: ['#F97316', '#FDE68A', '#38BDF8', '#86EFAC'],
    });
  }, []);

  const rain = useCallback(() => {
    const end = Date.now() + 1500;
    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#F97316', '#FDE68A'] });
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#38BDF8', '#86EFAC'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  const fireworks = useCallback(() => {
    const positions = [0.25, 0.5, 0.75];
    positions.forEach((x, i) => {
      setTimeout(() => {
        confetti({ particleCount: 100, spread: 70, origin: { x, y: 0.6 }, colors: ['#F97316', '#FDE68A', '#38BDF8', '#A855F7'] });
      }, i * 200);
    });
  }, []);

  return { burst, rain, fireworks };
}