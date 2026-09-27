import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Heart, 
  Coffee, 
  QrCode, 
  ShieldCheck, 
  Sparkles,
  Upload,
  Edit3,
  Trash2,
  RotateCcw,
  Image as ImageIcon,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Lock
} from 'lucide-react';
import { CreatorSupportConfig } from '../types';
import { playNavSound, playSuccessChime } from '../utils/audio';

export const DEFAULT_CREATOR_SUPPORT: CreatorSupportConfig = {
  holderName: "ALEXANDER R. VANCE",
  accountNumber: "001-984210-883",
  bankName: "National Educational Development Bank",
  swiftCode: "NEDBKHPP",
  currency: "USD / KHR / THB",
  message: "Help keep interactive HTML quizzes 100% free & open. All quiz modules are built as standalone, lightweight files without tracking or paywalls. Your generous donation funds curriculum research, hosting, and regular quiz expansions.",
  qrType: 'khqr'
};

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOwnerLoggedIn?: boolean;
  isAdminActive?: boolean;
  supportConfig?: CreatorSupportConfig;
  onUpdateSupportConfig?: (newConfig: CreatorSupportConfig) => void;
  initialEditMode?: boolean;
  onOpenOwnerLogin?: () => void;
}

export const DonationModal: React.FC<DonationModalProps> = ({ 
  isOpen, 
  onClose,
  isOwnerLoggedIn = false,
  isAdminActive = false,
  supportConfig = DEFAULT_CREATOR_SUPPORT,
  onUpdateSupportConfig,
  initialEditMode = false,
  onOpenOwnerLogin
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | 'custom'>(5);
  const [qrType, setQrType] = useState<'promptpay' | 'khqr' | 'universal' | 'custom'>(
    supportConfig.customQrImageUrl ? 'custom' : (supportConfig.qrType || 'khqr')
  );
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState<boolean>(initialEditMode);
  const [editForm, setEditForm] = useState<CreatorSupportConfig>(supportConfig);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEdit = isOwnerLoggedIn || isAdminActive;

  useEffect(() => {
    if (isOpen) {
      setEditForm(supportConfig);
      setIsEditing(initialEditMode);
      setUploadError(null);
      setSaveSuccessNotice(false);
      setIsDragOver(false);
      if (supportConfig.customQrImageUrl) {
        setQrType('custom');
      } else {
        setQrType(supportConfig.qrType || 'khqr');
      }
    }
  }, [isOpen, supportConfig, initialEditMode]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    playSuccessChime();
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WebP, SVG).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size exceeds 5MB limit. Please upload a smaller QR image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setEditForm(prev => ({
        ...prev,
        customQrImageUrl: dataUrl,
        qrType: 'custom'
      }));
      setUploadError(null);
      playSuccessChime();
    };
    reader.onerror = () => {
      setUploadError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  // Handle QR image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  // Remove uploaded QR
  const handleRemoveCustomQr = () => {
    playNavSound();
    setEditForm(prev => ({
      ...prev,
      customQrImageUrl: undefined,
      qrType: 'khqr'
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Save changes
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.holderName.trim()) {
      setUploadError('Account holder name is required.');
      return;
    }
    if (!editForm.accountNumber.trim()) {
      setUploadError('Account number or payment ID is required.');
      return;
    }

    playSuccessChime();
    onUpdateSupportConfig?.(editForm);
    setIsEditing(false);
    setSaveSuccessNotice(true);
    if (editForm.customQrImageUrl) {
      setQrType('custom');
    }
    setTimeout(() => setSaveSuccessNotice(false), 3000);
  };

  // Reset to default
  const handleResetDefaults = () => {
    playNavSound();
    setEditForm(DEFAULT_CREATOR_SUPPORT);
    onUpdateSupportConfig?.(DEFAULT_CREATOR_SUPPORT);
    setUploadError(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-white dark:bg-[#1e1e1e] border border-neutral-200 dark:border-neutral-700/80 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/60 dark:bg-[#252525]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-500 shadow-2xs">
              <Heart className="w-4 h-4 fill-rose-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <span>{isEditing ? 'Customize Creator Support' : 'Support the Creator'}</span>
                {supportConfig.customQrImageUrl && !isEditing && (
                  <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Custom QR
                  </span>
                )}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {isEditing ? 'Upload your bank QR and update payee information' : 'Help keep interactive HTML quizzes 100% free & open'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {canEdit ? (
              <button
                type="button"
                onClick={() => {
                  playNavSound();
                  setIsEditing(!isEditing);
                  setUploadError(null);
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  isEditing 
                    ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100 border-neutral-300' 
                    : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                }`}
                title={isEditing ? "Switch to preview view" : "Edit bank account and upload your own QR code"}
              >
                <Edit3 className="w-3 h-3" />
                <span>{isEditing ? 'Preview' : 'Edit QR'}</span>
              </button>
            ) : onOpenOwnerLogin ? (
              <button
                type="button"
                onClick={() => {
                  playNavSound();
                  onClose();
                  onOpenOwnerLogin();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer"
                title="Owner Login to customize QR and donation info"
              >
                <Lock className="w-3 h-3" />
                <span className="hidden sm:inline">Owner Login to Edit</span>
              </button>
            ) : null}

            <button
              onClick={() => {
                playNavSound();
                onClose();
              }}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {saveSuccessNotice && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 shadow-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Creator support details and QR code updated successfully!</span>
            </div>
          )}

          {/* EDIT MODE: Owner Form */}
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              {uploadError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2 shadow-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* QR Upload Section */}
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  Custom Bank / Payment QR Code Image
                </label>

                {editForm.customQrImageUrl ? (
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative group w-36 h-36 bg-white rounded-xl border-2 border-dashed border-emerald-400 p-2 flex items-center justify-center shrink-0 shadow-xs">
                      <img 
                        src={editForm.customQrImageUrl} 
                        alt="Custom QR Preview" 
                        className="max-w-full max-h-full object-contain rounded-lg"
                      />
                    </div>
                    <div className="flex-1 space-y-2 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Custom QR Image Loaded</span>
                      </div>
                      <p className="text-[11px] text-neutral-500 leading-relaxed">
                        This QR code will be displayed to users in the Support modal and the bottom-right floating widget.
                      </p>
                      <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 transition-colors cursor-pointer"
                        >
                          Change Image
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveCustomQr}
                          className="px-3 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-lg text-xs font-medium hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragOver(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragOver(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) processFile(file);
                    }}
                    className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      isDragOver 
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 scale-[1.01]' 
                        : 'border-neutral-300 dark:border-neutral-700 hover:border-blue-500 dark:hover:border-blue-400 bg-white dark:bg-[#1a1a1a]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                      {isDragOver ? 'Drop QR code image here' : 'Click or drop QR Code image here'}
                    </span>
                    <span className="text-[11px] text-neutral-400 mt-0.5">
                      PNG, JPG, WebP, or SVG (Max 5MB)
                    </span>
                  </div>
                )}

                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload} 
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden" 
                />
              </div>

              {/* Form Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Account Holder Name *
                  </label>
                  <input
                    type="text"
                    value={editForm.holderName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, holderName: e.target.value }))}
                    placeholder="e.g. John Doe / Organization Name"
                    className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Account Number / Payment ID *
                  </label>
                  <input
                    type="text"
                    value={editForm.accountNumber}
                    onChange={(e) => setEditForm(prev => ({ ...prev, accountNumber: e.target.value }))}
                    placeholder="e.g. 001-984210-883 or Phone / ID"
                    className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Bank / Institution Name
                  </label>
                  <input
                    type="text"
                    value={editForm.bankName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, bankName: e.target.value }))}
                    placeholder="e.g. National Bank / ABA / Kasikorn"
                    className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    SWIFT / BIC / Note
                  </label>
                  <input
                    type="text"
                    value={editForm.swiftCode}
                    onChange={(e) => setEditForm(prev => ({ ...prev, swiftCode: e.target.value }))}
                    placeholder="e.g. NEDBKHPP"
                    className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Accepted Currencies
                </label>
                <input
                  type="text"
                  value={editForm.currency}
                  onChange={(e) => setEditForm(prev => ({ ...prev, currency: e.target.value }))}
                  placeholder="e.g. USD / KHR / THB / EUR"
                  className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Thank You / Purpose Message
                </label>
                <textarea
                  rows={3}
                  value={editForm.message || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Tell your students and supporters how their contributions help..."
                  className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 font-medium cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Defaults</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playNavSound();
                      setIsEditing(false);
                      setEditForm(supportConfig);
                    }}
                    className="px-3.5 py-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Creator Support</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* VIEW MODE: Standard Donor View */
            <>
              {/* Thank You Note */}
              <div className="p-3.5 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/40 rounded-xl text-xs text-rose-950 dark:text-rose-200 leading-relaxed">
                <span className="font-semibold block mb-0.5 text-rose-900 dark:text-rose-100">
                  Support {supportConfig.holderName}
                </span>
                {supportConfig.message || DEFAULT_CREATOR_SUPPORT.message}
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
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        selectedAmount === amt
                          ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 shadow-xs'
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
                {supportConfig.customQrImageUrl && (
                  <button
                    onClick={() => {
                      playNavSound();
                      setQrType('custom');
                    }}
                    className={`flex-1 py-1 px-2 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                      qrType === 'custom' 
                        ? 'bg-white dark:bg-neutral-700 text-rose-600 dark:text-rose-300 shadow-2xs' 
                        : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                    }`}
                  >
                    ★ Creator QR
                  </button>
                )}
                <button
                  onClick={() => {
                    playNavSound();
                    setQrType('khqr');
                  }}
                  className={`flex-1 py-1 px-2 rounded-md font-medium text-xs transition-colors cursor-pointer ${
                    qrType === 'khqr' 
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs font-semibold' 
                      : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                >
                  KHQR (Bakong)
                </button>
                <button
                  onClick={() => {
                    playNavSound();
                    setQrType('promptpay');
                  }}
                  className={`flex-1 py-1 px-2 rounded-md font-medium text-xs transition-colors cursor-pointer ${
                    qrType === 'promptpay' 
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs font-semibold' 
                      : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                >
                  PromptPay
                </button>
                <button
                  onClick={() => {
                    playNavSound();
                    setQrType('universal');
                  }}
                  className={`flex-1 py-1 px-2 rounded-md font-medium text-xs transition-colors cursor-pointer ${
                    qrType === 'universal' 
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs font-semibold' 
                      : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                >
                  Universal Wire
                </button>
              </div>

              {/* QR Code Display Card */}
              <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-white rounded-xl border border-neutral-200 shadow-xs">
                {/* Header Badge on QR Card */}
                <div className="w-full flex items-center justify-between pb-2 border-b border-neutral-100 text-[11px] font-bold tracking-wider text-rose-600 uppercase">
                  <span>
                    {qrType === 'custom' 
                      ? 'Official Creator Payment QR'
                      : qrType === 'khqr' 
                      ? 'KHQR National Payment' 
                      : qrType === 'promptpay' 
                      ? 'PromptPay Thailand' 
                      : 'Global Wire Transfer'}
                  </span>
                  <span className="text-neutral-400 font-mono text-[10px]">{supportConfig.swiftCode}</span>
                </div>

                {/* Display QR: Custom Uploaded Image or High-Contrast SVG Vector */}
                <div className="my-3 p-2 bg-white rounded-lg flex items-center justify-center min-h-[190px]">
                  {qrType === 'custom' && supportConfig.customQrImageUrl ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={supportConfig.customQrImageUrl}
                        alt="Creator Payment QR"
                        className="w-48 h-48 object-contain rounded-lg shadow-xs"
                      />
                    </div>
                  ) : (
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

                      {/* Center Heart / Shield Icon */}
                      <circle cx="100" cy="100" r="16" fill="white" />
                      <circle cx="100" cy="100" r="13" fill="#e11d48" />
                      <path
                        d="M100 106s-4.5-3-6-5.5a3.5 3.5 0 0 1 5.5-4.2L100 97.5l.5-.8a3.5 3.5 0 0 1 5.5 4.2c-1.5 2.5-6 5.5-6 5.5z"
                        fill="white"
                      />
                    </svg>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-neutral-600 font-medium pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Instant Verification · Scan with Mobile Banking / Payment App</span>
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
                      {supportConfig.holderName}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(supportConfig.holderName, 'name')}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200/80 dark:hover:bg-neutral-700 transition-colors shrink-0 cursor-pointer"
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
                      Account Number / Payment ID
                    </span>
                    <span className="text-xs font-mono font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                      {supportConfig.accountNumber}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(supportConfig.accountNumber, 'account')}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200/80 dark:hover:bg-neutral-700 transition-colors shrink-0 cursor-pointer"
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
                      Bank / SWIFT / Currencies
                    </span>
                    <span className="text-xs text-neutral-700 dark:text-neutral-300 truncate">
                      {supportConfig.bankName} {supportConfig.swiftCode ? `(${supportConfig.swiftCode})` : ''} · {supportConfig.currency}
                    </span>
                  </div>
                  {supportConfig.swiftCode && (
                    <button
                      onClick={() => copyToClipboard(supportConfig.swiftCode, 'swift')}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200/80 dark:hover:bg-neutral-700 transition-colors shrink-0 cursor-pointer"
                    >
                      {copiedField === 'swift' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-neutral-400" />
                          <span>Copy SWIFT</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#252525] flex items-center justify-between">
          <span className="text-[11px] text-neutral-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>100% of proceeds fund open educational quiz resources</span>
          </span>
          <button
            onClick={() => {
              playNavSound();
              onClose();
            }}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-900 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
