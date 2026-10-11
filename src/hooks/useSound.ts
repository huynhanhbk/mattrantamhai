import { useCallback } from 'react';
import {
  initAudio,
  playCorrectSound,
  playLotteryWinSound,
  playMediumTickSound,
  playRevealAnswerSound,
  playSoftTickSound,
  playSpinTickSound,
  playStartSound,
  playTickSound,
  playTimeoutSound,
  playUrgentTickSound,
  playUrgentWarningTickSound,
  playWrongSound,
} from '../utils/audio';

export function useSound(enabled: boolean, volume = 0.8) {
  const triggerTick = useCallback(() => {
    if (!enabled) return;
    playTickSound(volume);
  }, [enabled, volume]);

  const triggerUrgentTick = useCallback(() => {
    if (!enabled) return;
    playUrgentTickSound(volume);
  }, [enabled, volume]);

  const triggerSoftTick = useCallback(() => {
    if (!enabled) return;
    playSoftTickSound(volume);
  }, [enabled, volume]);

  const triggerMediumTick = useCallback(() => {
    if (!enabled) return;
    playMediumTickSound(volume);
  }, [enabled, volume]);

  const triggerWarningTick = useCallback(() => {
    if (!enabled) return;
    playUrgentWarningTickSound(volume);
  }, [enabled, volume]);

  const triggerTimeout = useCallback(() => {
    if (!enabled) return;
    playTimeoutSound(volume);
  }, [enabled, volume]);

  const triggerCorrect = useCallback(() => {
    if (!enabled) return;
    playCorrectSound(volume);
  }, [enabled, volume]);

  const triggerWrong = useCallback(() => {
    if (!enabled) return;
    playWrongSound(volume);
  }, [enabled, volume]);

  const triggerStart = useCallback(() => {
    if (!enabled) return;
    playStartSound(volume);
  }, [enabled, volume]);

  const triggerSpinTick = useCallback((pitch = 900) => {
    if (!enabled) return;
    playSpinTickSound(pitch, volume);
  }, [enabled, volume]);

  const triggerLotteryWin = useCallback(() => {
    if (!enabled) return;
    playLotteryWinSound(volume);
  }, [enabled, volume]);

  const triggerReveal = useCallback(() => {
    if (!enabled) return;
    playRevealAnswerSound(volume);
  }, [enabled, volume]);

  return {
    initAudio,
    triggerTick,
    triggerUrgentTick,
    triggerSoftTick,
    triggerMediumTick,
    triggerWarningTick,
    triggerTimeout,
    triggerCorrect,
    triggerWrong,
    triggerStart,
    triggerSpinTick,
    triggerLotteryWin,
    triggerReveal,
  };
}
