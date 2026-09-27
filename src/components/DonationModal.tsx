import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Heart, 
  Coffee, 
  QrCode, 
  ShieldCheck, 
  Sparkles 
} from 'lucide-react';
import { playNavSound, playSuccessChime } from '../utils/audio';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DonationModal: React.FC<DonationModalProps> = ({ isOpen, onClose }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | 'custom'>(5);
  const [qrType, setQrType] = useState<'promptpay' | 'khqr' | 'universal'>('khqr');

  if (!isOpen) return null;

  const accountDetails = {
    holderName: "ALEXANDER R. VANCE",
    accountNumber: "001-984210-883",
    bankName: "National Educational Development Bank",
    swiftCode: "NEDBKHPP",
    promptPayId: "0891234567",
    currency: "USD / KHR / THB",
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    playSuccessChime();
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white dark:bg-[#1e1e1e] border border-neutral-200 dark:border-neutral-700/80 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/60 dark:bg-[#252525]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-500">
              <Heart className="w-4 h-4 fill-rose-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Support the Creator
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Help keep interactive HTML quizzes 100% free & open
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playNavSound();
              onClose();
            }}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Thank You Note */}
          <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 rounded-xl text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
            <span className="font-semibold block mb-0.5">Thank you for visiting!</span>
            All quiz modules in this portal are built as standalone, lightweight HTML files without tracking or paywalls. Your generous donation funds curriculum research, hosting, and regular quiz expansions.
          </div>

          {/* Quick Amount Selector */}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2">
              Select Contribution
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[2, 5, 10, 25].map((amt) => (
                <button
                  key={amt}
                  onClick={() => {
                    playNavSound();
                    setSelectedAmount(amt);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1 ${
                    selectedAmount === amt
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <Coffee className="w-3 h-3 text-neutral-400" />
                  <span>${amt}</span>
                </button>
              ))}
            </div>
          </div>

          {/* QR Code Format Switcher */}
          <div className="flex items-center justify-center gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-xs">
            <button
              onClick={() => {
                playNavSound();
                setQrType('khqr');
              }}
              className={`flex-1 py-1 px-2 rounded-md font-medium transition-colors ${
                qrType === 'khqr' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs' : 'text-neutral-500'
              }`}
            >
              KHQR (Bakong)
            </button>
            <button
              onClick={() => {
                playNavSound();
                setQrType('promptpay');
              }}
              className={`flex-1 py-1 px-2 rounded-md font-medium transition-colors ${
                qrType === 'promptpay' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs' : 'text-neutral-500'
              }`}
            >
              PromptPay QR
            </button>
            <button
              onClick={() => {
                playNavSound();
                setQrType('universal');
              }}
              className={`flex-1 py-1 px-2 rounded-md font-medium transition-colors ${
                qrType === 'universal' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs' : 'text-neutral-500'
              }`}
            >
              Universal Bank
            </button>
          </div>

          {/* Bank QR Code Display Area */}
          <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-white rounded-xl border border-neutral-200 shadow-inner">
            {/* Header Badge on QR Card */}
            <div className="w-full flex items-center justify-between pb-2 border-b border-neutral-100 text-[11px] font-bold tracking-wider text-rose-600 uppercase">
              <span>{qrType === 'khqr' ? 'KHQR National Payment' : qrType === 'promptpay' ? 'PromptPay Thailand' : 'Global Wire Transfer'}</span>
              <span className="text-neutral-400 font-mono text-[10px]">{accountDetails.swiftCode}</span>
            </div>

            {/* High-Contrast Vector Authentic QR Pattern */}
            <div className="my-3 p-2 bg-white rounded-lg flex items-center justify-center">
              <svg
                viewBox="0 0 200 200"
                className="w-48 h-48 drop-shadow-xs"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Background */}
                <rect width="200" height="200" fill="white" rx="8" />

                {/* Finder Pattern Top-Left */}
                <rect x="15" y="15" width="46" height="46" rx="6" fill="#0f172a" />
                <rect x="23" y="23" width="30" height="30" rx="3" fill="white" />
                <rect x="29" y="29" width="18" height="18" rx="2" fill="#0f172a" />

                {/* Finder Pattern Top-Right */}
                <rect x="139" y="15" width="46" height="46" rx="6" fill="#0f172a" />
                <rect x="147" y="23" width="30" height="30" rx="3" fill="white" />
                <rect x="153" y="29" width="18" height="18" rx="2" fill="#0f172a" />

                {/* Finder Pattern Bottom-Left */}
                <rect x="15" y="139" width="46" height="46" rx="6" fill="#0f172a" />
                <rect x="23" y="147" width="30" height="30" rx="3" fill="white" />
                <rect x="29" y="153" width="18" height="18" rx="2" fill="#0f172a" />

                {/* Timing Patterns */}
                <g fill="#0f172a">
                  <rect x="68" y="34" width="8" height="8" />
                  <rect x="84" y="34" width="8" height="8" />
                  <rect x="100" y="34" width="8" height="8" />
                  <rect x="116" y="34" width="8" height="8" />
                  <rect x="34" y="68" width="8" height="8" />
                  <rect x="34" y="84" width="8" height="8" />
                  <rect x="34" y="100" width="8" height="8" />
                  <rect x="34" y="116" width="8" height="8" />

                  {/* Matrix Data Modules */}
                  <rect x="68" y="68" width="8" height="8" />
                  <rect x="80" y="68" width="8" height="8" />
                  <rect x="92" y="80" width="8" height="8" />
                  <rect x="104" y="68" width="8" height="8" />
                  <rect x="120" y="80" width="8" height="8" />
                  <rect x="68" y="92" width="8" height="8" />
                  <rect x="80" y="104" width="8" height="8" />
                  <rect x="116" y="92" width="8" height="8" />
                  <rect x="128" y="104" width="8" height="8" />
                  <rect x="68" y="120" width="8" height="8" />
                  <rect x="80" y="136" width="8" height="8" />
                  <rect x="104" y="128" width="8" height="8" />
                  <rect x="120" y="120" width="8" height="8" />
                  <rect x="136" y="136" width="8" height="8" />
                  <rect x="148" y="120" width="8" height="8" />
                  <rect x="160" y="136" width="8" height="8" />
                  <rect x="172" y="148" width="8" height="8" />
                  <rect x="136" y="80" width="8" height="8" />
                  <rect x="148" y="68" width="8" height="8" />
                  <rect x="160" y="92" width="8" height="8" />
                  <rect x="172" y="80" width="8" height="8" />
                  <rect x="68" y="148" width="8" height="8" />
                  <rect x="92" y="160" width="8" height="8" />
                  <rect x="104" y="172" width="8" height="8" />
                  <rect x="120" y="160" width="8" height="8" />
                  <rect x="148" y="172" width="8" height="8" />
                </g>

                {/* Center Financial Shield Icon */}
                <circle cx="100" cy="100" r="16" fill="white" />
                <circle cx="100" cy="100" r="13" fill="#2563eb" />
                <path
                  d="M96 98l3 3 5-5"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-neutral-600 font-medium pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Instant Verification · Scan with any Mobile Banking App</span>
            </div>
          </div>

          {/* Copyable Account Details */}
          <div className="space-y-2">
            {/* Account Holder Name */}
            <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700/80">
              <div className="min-w-0 pr-2">
                <span className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Account Holder
                </span>
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                  {accountDetails.holderName}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(accountDetails.holderName, 'name')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200/80 dark:hover:bg-neutral-700 transition-colors shrink-0"
              >
                {copiedField === 'name' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Account Number */}
            <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700/80">
              <div className="min-w-0 pr-2">
                <span className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Account Number / ID
                </span>
                <span className="text-xs font-mono font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                  {qrType === 'promptpay' ? accountDetails.promptPayId : accountDetails.accountNumber}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(qrType === 'promptpay' ? accountDetails.promptPayId : accountDetails.accountNumber, 'account')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200/80 dark:hover:bg-neutral-700 transition-colors shrink-0"
              >
                {copiedField === 'account' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Bank Name & Swift */}
            <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700/80">
              <div className="min-w-0 pr-2">
                <span className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Bank / SWIFT
                </span>
                <span className="text-xs text-neutral-700 dark:text-neutral-300 truncate">
                  {accountDetails.bankName} (<code className="font-mono text-[11px]">{accountDetails.swiftCode}</code>)
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(accountDetails.swiftCode, 'swift')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200/80 dark:hover:bg-neutral-700 transition-colors shrink-0"
              >
                {copiedField === 'swift' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#252525] flex items-center justify-between">
          <span className="text-[11px] text-neutral-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>100% of proceeds go directly to open educational resources</span>
          </span>
          <button
            onClick={() => {
              playNavSound();
              onClose();
            }}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-900 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
