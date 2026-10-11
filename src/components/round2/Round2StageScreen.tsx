import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  ArrowLeft,
  AlertTriangle,
  Award,
  Save,
  CheckCircle2,
  StopCircle,
  Sparkles,
} from 'lucide-react';
import { Situation } from '../../types/competition';
import { useSound } from '../../hooks/useSound';
import { useStageKeyboard } from '../../hooks/useStageKeyboard';

interface Round2StageScreenProps {
  situation: Situation;
  soundEnabled: boolean;
  onCompleteSituation: (updatedSituation: Situation) => void;
  onBackToSituationList: () => void;
  onToggleFullscreen: () => void;
}

export const Round2StageScreen: React.FC<Round2StageScreenProps> = ({
  situation,
  soundEnabled,
  onCompleteSituation,
  onBackToSituationList,
  onToggleFullscreen,
}) => {
  const {
    triggerSoftTick,
    triggerMediumTick,
    triggerWarningTick,
    triggerTimeout,
    triggerStart,
  } = useSound(soundEnabled);

  // Time configurations
  const BASE_TIME_SECONDS = 7 * 60; // 420 seconds = 07:00
  const [timeLeft, setTimeLeft] = useState(BASE_TIME_SECONDS);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isBaseTimeOut, setIsBaseTimeOut] = useState(false);

  // Overtime states
  const [isOvertimeMode, setIsOvertimeMode] = useState(false);
  const [overtimeSeconds, setOvertimeSeconds] = useState(0);

  // Completion state (no scoring calculations)
  const [isCompleted, setIsCompleted] = useState(false);

  // Accurate timestamp refs
  const baseTimerEndRef = useRef<number | null>(null);
  const remainingBaseTimeRef = useRef<number>(BASE_TIME_SECONDS);
  const overtimeStartTimestampRef = useRef<number | null>(null);
  const accumulatedOvertimeRef = useRef<number>(0);
  const lastSecondRef = useRef<number | null>(null);

  // Formatting helpers
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Reset timer
  const resetTimer = useCallback(() => {
    setIsTimerRunning(false);
    setIsBaseTimeOut(false);
    setIsOvertimeMode(false);
    setTimeLeft(BASE_TIME_SECONDS);
    setOvertimeSeconds(0);
    remainingBaseTimeRef.current = BASE_TIME_SECONDS;
    accumulatedOvertimeRef.current = 0;
    baseTimerEndRef.current = null;
    overtimeStartTimestampRef.current = null;
    lastSecondRef.current = null;
  }, [BASE_TIME_SECONDS]);

  // Start / Resume Timer
  const startTimer = useCallback(() => {
    triggerStart();
    setIsTimerRunning(true);

    if (!isBaseTimeOut) {
      baseTimerEndRef.current = Date.now() + remainingBaseTimeRef.current * 1000;
    } else {
      // Running in overtime
      overtimeStartTimestampRef.current = Date.now() - accumulatedOvertimeRef.current * 1000;
      setIsOvertimeMode(true);
    }
  }, [isBaseTimeOut, triggerStart]);

  // Pause Timer
  const pauseTimer = useCallback(() => {
    if (!isTimerRunning) return;
    setIsTimerRunning(false);

    if (!isBaseTimeOut && baseTimerEndRef.current) {
      const remaining = Math.max(0, (baseTimerEndRef.current - Date.now()) / 1000);
      remainingBaseTimeRef.current = remaining;
    } else if (isBaseTimeOut && overtimeStartTimestampRef.current) {
      const elapsed = Math.floor((Date.now() - overtimeStartTimestampRef.current) / 1000);
      accumulatedOvertimeRef.current = elapsed;
    }
  }, [isTimerRunning, isBaseTimeOut]);

  // Main high-precision timer loop with 3 distinct audio stages:
  // 1. > 60s: âm thanh đếm giây nhẹ nhàng, âm lượng rất nhỏ (soft tick)
  // 2. 60s - 16s: âm thanh to hơn rõ ràng (medium tick)
  // 3. 15s - 1s: âm thanh cảnh báo khác to hơn nữa (urgent warning tick)
  // 4. 0s: chuông kết thúc (timeout bell)
  useEffect(() => {
    if (!isTimerRunning) return;

    const interval = setInterval(() => {
      const now = Date.now();

      if (!isBaseTimeOut && baseTimerEndRef.current) {
        const msLeft = baseTimerEndRef.current - now;
        const secsLeft = Math.max(0, Math.ceil(msLeft / 1000));
        setTimeLeft(secsLeft);

        // Sound triggers when integer second ticks down
        if (secsLeft !== lastSecondRef.current) {
          lastSecondRef.current = secsLeft;

          if (secsLeft > 60) {
            triggerSoftTick();
          } else if (secsLeft > 15) {
            triggerMediumTick();
          } else if (secsLeft > 0) {
            triggerWarningTick();
          }
        }

        if (msLeft <= 0) {
          setTimeLeft(0);
          setIsBaseTimeOut(true);
          triggerTimeout();
          // Stop running, prompt operator to start overtime if team continues
          setIsTimerRunning(false);
        }
      } else if (isBaseTimeOut && isOvertimeMode && overtimeStartTimestampRef.current) {
        const elapsedSecs = Math.floor((now - overtimeStartTimestampRef.current) / 1000);
        setOvertimeSeconds(elapsedSecs);
        accumulatedOvertimeRef.current = elapsedSecs;
      }
    }, 150);

    return () => clearInterval(interval);
  }, [
    isTimerRunning,
    isBaseTimeOut,
    isOvertimeMode,
    triggerSoftTick,
    triggerMediumTick,
    triggerWarningTick,
    triggerTimeout,
  ]);

  // Operator explicitly starts overtime tracking
  const handleStartOvertime = () => {
    setIsOvertimeMode(true);
    overtimeStartTimestampRef.current = Date.now() - accumulatedOvertimeRef.current * 1000;
    setIsTimerRunning(true);
  };

  // Stop all timers when presentation ends
  const handleStopAll = () => {
    setIsTimerRunning(false);
    if (overtimeStartTimestampRef.current) {
      const finalOver = Math.floor((Date.now() - overtimeStartTimestampRef.current) / 1000);
      setOvertimeSeconds(finalOver);
      accumulatedOvertimeRef.current = finalOver;
    }
  };

  // Calculate penalties according to official rules:
  // - Vượt dưới 2 phút (< 120s): trừ 2 điểm
  // - Vượt từ 3 đến 5 phút (120s - 300s): trừ 5 điểm
  // - Vượt trên 5 phút (> 300s): trừ 10 điểm
  let penaltyPoints = 0;
  if (overtimeSeconds > 0) {
    if (overtimeSeconds < 120) {
      penaltyPoints = 2;
    } else if (overtimeSeconds <= 300) {
      penaltyPoints = 5;
    } else {
      penaltyPoints = 10;
    }
  }

  // Save situation completion (No scoring calculation)
  const handleSaveResult = () => {
    const updatedSituation: Situation = {
      ...situation,
      status: 'completed',
      elapsedSeconds: BASE_TIME_SECONDS - timeLeft,
      overtimeSeconds: overtimeSeconds,
      penaltyScore: penaltyPoints,
      playedAt: new Date().toLocaleString('vi-VN'),
    };

    onCompleteSituation(updatedSituation);
    setIsCompleted(true);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#6366f1', '#a855f7', '#ec4899', '#10b981'],
    });
  };

  // Keyboard navigation
  useStageKeyboard({
    onSpace: () => {
      if (isTimerRunning) {
        pauseTimer();
      } else {
        if (isBaseTimeOut && !isOvertimeMode) {
          handleStartOvertime();
        } else {
          startTimer();
        }
      }
    },
    onResetTimer: resetTimer,
    onToggleFullscreen,
  });

  return (
    <div className="relative min-h-[calc(100vh-68px)] flex flex-col justify-between p-6 md:p-8 lg:p-12 bg-[#f0f6fd] dark:bg-slate-950 text-slate-900 dark:text-slate-100 select-none overflow-hidden transition-colors duration-200">
      {/* Stage Header */}
      <div className="relative z-10 w-full flex items-center justify-between gap-4 pb-3 border-b border-sky-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToSituationList}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-sky-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white shadow-sm transition"
            title="Quay lại danh sách tình huống"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="px-3.5 py-1 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-300 dark:border-indigo-500/40 text-indigo-800 dark:text-indigo-300 text-sm font-black uppercase">
            {situation.title}
          </div>
          <div className="hidden sm:block text-sm md:text-base font-bold text-slate-700 dark:text-slate-300">
            PHẦN THI: XỬ LÝ TÌNH HUỐNG
          </div>
        </div>

        {/* Dual Timers Header Area */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* Main 07:00 countdown timer */}
          <div
            className={`flex items-center gap-2 px-4 md:px-5 py-2 rounded-2xl border-2 shadow-lg dark:shadow-xl transition-all ${
              timeLeft === 0
                ? 'bg-rose-100 dark:bg-rose-950/80 border-rose-500 text-rose-800 dark:text-rose-300 shadow-rose-950/20 dark:shadow-rose-950/50'
                : timeLeft <= 15
                ? 'bg-rose-100 dark:bg-rose-950/90 border-rose-500 text-rose-800 dark:text-rose-300 shadow-rose-950/20 dark:shadow-rose-950/50 animate-bounce'
                : timeLeft <= 60
                ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-500 dark:border-amber-400 text-amber-800 dark:text-amber-300 shadow-amber-950/20 dark:shadow-amber-950/50 animate-pulse'
                : 'bg-indigo-50 dark:bg-slate-900 border-indigo-400 dark:border-indigo-500/50 text-indigo-900 dark:text-indigo-300 shadow-indigo-950/20 dark:shadow-indigo-950/40'
            }`}
          >
            <Clock className="w-6 h-6 md:w-7 md:h-7" />
            <div className="text-2xl md:text-4xl font-black font-mono tracking-tight leading-none">
              {formatTime(timeLeft)}
            </div>
          </div>

          {/* Large Overtime Display Badge in Header */}
          {overtimeSeconds > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-rose-100 dark:bg-rose-950 border-2 border-rose-500 text-rose-800 dark:text-rose-200 animate-pulse shadow-lg">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
              <div className="text-xl md:text-2xl font-mono font-black">
                +{formatTime(overtimeSeconds)}
              </div>
              <div className="text-xs font-black px-2 py-0.5 rounded-lg bg-rose-600 text-white uppercase tracking-wider">
                -{penaltyPoints}đ
              </div>
            </div>
          )}

          {/* Timer controls */}
          <div className="flex items-center gap-1.5">
            {isTimerRunning ? (
              <button
                onClick={pauseTimer}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white shadow-sm"
                title="Tạm dừng (Space)"
              >
                <Pause className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={startTimer}
                className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950 border border-indigo-300 dark:border-indigo-500/50 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900 shadow-sm"
                title="Bắt đầu / Tiếp tục (Space)"
              >
                <Play className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={resetTimer}
              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-indigo-700 dark:hover:text-indigo-300 shadow-sm"
              title="Reset 07:00 (Phím R)"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Situation Content Stage Display - Extra Large font, High contrast & Expanded Width */}
      <div className="relative z-10 max-w-7xl 2xl:max-w-[1550px] w-full mx-auto my-auto py-4 md:py-6">
        {/* Warning notification when base time runs out */}
        {isBaseTimeOut && (
          <div className="p-4 mb-4 rounded-2xl bg-rose-600 text-white font-black text-sm md:text-base uppercase tracking-wider flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl animate-bounce">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              <span>ĐÃ HẾT 07 PHÚT QUY ĐỊNH</span>
            </div>
            {!isOvertimeMode && (
              <button
                onClick={handleStartOvertime}
                className="px-5 py-2 rounded-xl bg-white text-rose-900 text-sm font-black hover:bg-rose-50 transition shadow"
              >
                BẮT ĐẦU TÍNH THỜI GIAN VƯỢT
              </button>
            )}
          </div>
        )}

        {/* Grand Card for Situation Text - Extra Wide & Massive Font for Projector */}
        <div className="p-8 sm:p-12 md:p-16 lg:p-20 rounded-3xl bg-white/95 dark:bg-slate-900/95 border-2 border-indigo-400/60 dark:border-indigo-500/40 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
            <span className="text-sm md:text-base font-black tracking-widest text-indigo-700 dark:text-indigo-400 uppercase">
              NỘI DUNG TÌNH HUỐNG THỰC TẾ TẠI ĐỊA PHƯƠNG
            </span>
            <span className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-semibold">
              Đội thi có tối đa 07 phút để hội ý và trình bày
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-slate-900 dark:text-white leading-relaxed md:leading-relaxed lg:leading-normal tracking-tight text-center md:text-left">
            {situation.content}
          </h2>

          {situation.imageUrl && (
            <div className="mt-8 rounded-2xl overflow-hidden flex justify-center max-h-72">
              <img
                src={situation.imageUrl}
                alt="Minh họa tình huống"
                className="object-contain max-h-72 rounded-xl border border-slate-300 dark:border-slate-700 shadow-md"
              />
            </div>
          )}
        </div>
      </div>

      {/* Operator & Overtime / Penalty Dashboard (Score calculation completely removed) */}
      <div className="relative z-10 w-full max-w-7xl 2xl:max-w-[1550px] mx-auto pt-4 border-t border-sky-200 dark:border-slate-800/80">
        <div className="p-4 md:p-6 rounded-3xl bg-white/95 dark:bg-slate-900/90 border border-sky-200 dark:border-slate-700/80 shadow-lg flex flex-col lg:flex-row items-center justify-between gap-5">
          {/* Overtime and Penalty Points - PROMINENT & EXTRA LARGE */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 w-full lg:w-auto">
            {/* Large Card: Thời Gian Vượt Giờ */}
            <div
              className={`p-3.5 sm:p-4 rounded-2xl border-2 flex items-center gap-3.5 transition shadow-sm ${
                overtimeSeconds > 0
                  ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-900 dark:text-rose-200 animate-pulse'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                  overtimeSeconds > 0
                    ? 'bg-rose-100 dark:bg-rose-900/60 border-rose-300 text-rose-600 dark:text-rose-300'
                    : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500'
                }`}
              >
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">
                  THỜI GIAN VƯỢT GIỜ
                </div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-black font-mono tracking-tight leading-none text-rose-600 dark:text-rose-300 mt-0.5">
                  +{formatTime(overtimeSeconds)}
                  <span className="text-xs font-semibold ml-2 font-sans opacity-75">
                    ({overtimeSeconds}s)
                  </span>
                </div>
              </div>
            </div>

            {/* Large Card: Mức Điểm Trừ */}
            <div
              className={`p-3.5 sm:p-4 rounded-2xl border-2 flex items-center gap-3.5 transition shadow-sm ${
                penaltyPoints > 0
                  ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-900 dark:text-rose-200'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 text-emerald-900 dark:text-emerald-200'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                  penaltyPoints > 0
                    ? 'bg-rose-100 dark:bg-rose-900/60 border-rose-300 text-rose-600 dark:text-rose-300'
                    : 'bg-emerald-100 dark:bg-emerald-900/60 border-emerald-300 text-emerald-600 dark:text-emerald-300'
                }`}
              >
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <div
                  className={`text-[11px] font-black uppercase tracking-wider ${
                    penaltyPoints > 0
                      ? 'text-rose-700 dark:text-rose-400'
                      : 'text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  MỨC ĐIỂM TRỪ
                </div>
                <div
                  className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-none mt-0.5 ${
                    penaltyPoints > 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {penaltyPoints > 0 ? `-${penaltyPoints} ĐIỂM` : '0 ĐIỂM'}
                </div>
              </div>
            </div>

            {/* Rule reference tags */}
            <div className="hidden xl:flex flex-col gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-semibold pl-2 border-l border-slate-200 dark:border-slate-800">
              <div>• Dưới 2 phút: <strong className="text-rose-600 dark:text-rose-400">-2 điểm</strong></div>
              <div>• Từ 3 đến 5 phút: <strong className="text-rose-600 dark:text-rose-400">-5 điểm</strong></div>
              <div>• Trên 5 phút: <strong className="text-rose-600 dark:text-rose-400">-10 điểm</strong></div>
            </div>
          </div>

          {/* Action buttons (Overtime control & Save/Complete) */}
          <div className="flex flex-wrap items-center justify-center gap-3 w-full lg:w-auto">
            {/* Overtime Controls */}
            {isBaseTimeOut && !isOvertimeMode && (
              <button
                onClick={handleStartOvertime}
                className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-rose-950/20 dark:shadow-rose-950/50 transition active:scale-95"
              >
                <Clock className="w-5 h-5" />
                <span>Bắt đầu tính vượt giờ</span>
              </button>
            )}

            {isOvertimeMode && isTimerRunning && (
              <button
                onClick={handleStopAll}
                className="px-5 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-sm flex items-center gap-2 shadow-lg transition active:scale-95"
              >
                <StopCircle className="w-5 h-5" />
                <span>Dừng đếm vượt giờ</span>
              </button>
            )}

            {isOvertimeMode && !isTimerRunning && (
              <button
                onClick={handleStartOvertime}
                className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm flex items-center gap-2 shadow-lg transition active:scale-95"
              >
                <Play className="w-5 h-5" />
                <span>Tiếp tục đếm vượt giờ</span>
              </button>
            )}

            {/* Complete situation button */}
            <button
              id="save-round2-btn"
              onClick={handleSaveResult}
              className="px-7 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm md:text-base flex items-center gap-2 shadow-xl shadow-emerald-950/20 dark:shadow-emerald-950/40 transition active:scale-95"
            >
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
              <span>Hoàn thành tình huống</span>
            </button>
          </div>
        </div>

        {/* Feedback after completion */}
        {isCompleted && (
          <div className="mt-3 p-3.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-400 dark:border-emerald-500/60 text-emerald-900 dark:text-emerald-300 text-sm font-bold flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span>
                Đã hoàn thành {situation.title} • Thời gian trình bày:{' '}
                {formatTime(BASE_TIME_SECONDS - timeLeft)}
                {overtimeSeconds > 0
                  ? ` (Vượt giờ: +${formatTime(overtimeSeconds)}, Điểm trừ: -${penaltyPoints}đ)`
                  : ' (Trong thời gian quy định)'}
              </span>
            </div>
            <button
              onClick={onBackToSituationList}
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black shadow transition"
            >
              Về danh sách tình huống
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
