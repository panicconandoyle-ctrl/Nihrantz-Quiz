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
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Lock,
  Github,
  Loader2,
  Key
} from 'lucide-react';
import { CreatorSupportConfig } from '../types';
import { playNavSound, playSuccessChime } from '../utils/audio';
import { 
  getStoredGithubConfig, 
  saveGithubConfig, 
  commitBinaryFileToGitHub, 
  commitSupportConfigToGitHub,
  GitHubConfig 
} from '../services/githubService';

export const DEFAULT_CREATOR_SUPPORT: CreatorSupportConfig = {
  holderName: "Nihrantz",
  accountNumber: "087886166",
  bankName: "Educational Quiz Fund",
  swiftCode: "",
  currency: "USD / International",
  message: "Help keep interactive HTML quizzes 100% free & open. All quiz modules are built as standalone, lightweight files without tracking or paywalls. Your generous donation funds curriculum research, hosting, and regular quiz expansions.",
  customQrImageUrl: "https://raw.githubusercontent.com/panicconandoyle-ctrl/Nihrantz-Quiz/main/assets/creator_qr.jpg",
  githubQrPath: "assets/creator_qr.jpg",
  githubCommitUrl: "https://github.com/panicconandoyle-ctrl/Nihrantz-Quiz/commit/dd03a82280035d85eae379eaa9c82c2680e7b4b9"
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
  onOpenAdminConfig?: () => void;
}

export const DonationModal: React.FC<DonationModalProps> = ({ 
  isOpen, 
  onClose,
  isOwnerLoggedIn = false,
  isAdminActive = false,
  supportConfig = DEFAULT_CREATOR_SUPPORT,
  onUpdateSupportConfig,
  initialEditMode = false,
  onOpenOwnerLogin,
  onOpenAdminConfig
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | 'custom'>(5);
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState<boolean>(initialEditMode);
  const [editForm, setEditForm] = useState<CreatorSupportConfig>(supportConfig);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isUploadingToGitHub, setIsUploadingToGitHub] = useState<boolean>(false);
  
  // Inline GitHub PAT setup if token not yet provided
  const [patInput, setPatInput] = useState<string>('');
  const [showPatField, setShowPatField] = useState<boolean>(false);
  const [ghConfig, setGhConfig] = useState<GitHubConfig>(() => getStoredGithubConfig());

  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEdit = isOwnerLoggedIn || isAdminActive;

  useEffect(() => {
    if (isOpen) {
      setEditForm(supportConfig);
      setIsEditing(initialEditMode);
      setUploadError(null);
      setSaveSuccessNotice(null);
      setIsDragOver(false);
      setIsUploadingToGitHub(false);
      setGhConfig(getStoredGithubConfig());
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

  const handleSavePatInline = () => {
    if (!patInput.trim()) return;
    const updated: GitHubConfig = {
      ...ghConfig,
      token: patInput.trim(),
    };
    saveGithubConfig(updated);
    setGhConfig(updated);
    setShowPatField(false);
    setPatInput('');
    playSuccessChime();
    setSaveSuccessNotice('GitHub Personal Access Token saved successfully! You can now store QR codes directly in GitHub.');
    setTimeout(() => setSaveSuccessNotice(null), 4000);
  };

  // Process and upload QR image file
  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WebP, SVG).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size exceeds 5MB limit. Please upload a smaller QR image.');
      return;
    }

    setUploadError(null);

    const reader = new FileReader();
    reader.onerror = () => {
      setUploadError('Failed to read image file.');
    };

    reader.onload = async () => {
      const dataUrl = reader.result as string;

      // Extract file extension
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const cleanExt = ['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(fileExt) ? fileExt : 'png';
      const filename = `creator_qr.${cleanExt}`;
      const folderPath = 'assets';
      const fullPath = `${folderPath}/${filename}`;

      // Update local preview state and propagate to parent immediately so it shows on user view
      const immediateConfig: CreatorSupportConfig = {
        ...editForm,
        customQrImageUrl: dataUrl,
        githubQrPath: fullPath,
      };
      setEditForm(immediateConfig);
      onUpdateSupportConfig?.(immediateConfig);

      // Check if GitHub token is configured for direct repository commit
      const currentConfig = getStoredGithubConfig();
      if (currentConfig.token) {
        setIsUploadingToGitHub(true);
        setUploadError(null);

        try {
          const res = await commitBinaryFileToGitHub(
            folderPath,
            filename,
            dataUrl,
            `Upload creator QR code image (${filename}) via Nihrantz Quiz Explorer`,
            currentConfig
          );

          setIsUploadingToGitHub(false);

          if (res.success) {
            const updatedConfig: CreatorSupportConfig = {
              ...immediateConfig,
              customQrImageUrl: res.rawUrl || dataUrl,
              githubQrPath: fullPath,
              githubCommitUrl: res.commitUrl,
            };
            setEditForm(updatedConfig);
            onUpdateSupportConfig?.(updatedConfig);
            
            // Also store support configuration JSON in GitHub repository
            await commitSupportConfigToGitHub(updatedConfig, 'Sync creator support config to GitHub', currentConfig);

            playSuccessChime();
            setSaveSuccessNotice(`Successfully committed QR code to GitHub at ${fullPath}!`);
            setTimeout(() => setSaveSuccessNotice(null), 5000);
          } else {
            setUploadError(`QR image loaded locally, but GitHub upload failed: ${res.error}. Check your GitHub PAT permissions.`);
          }
        } catch (err: unknown) {
          setIsUploadingToGitHub(false);
          const msg = err instanceof Error ? err.message : 'Failed to commit to GitHub';
          setUploadError(`Failed to commit QR image to GitHub: ${msg}`);
        }
      } else {
        // No GitHub token configured yet
        setShowPatField(true);
        setSaveSuccessNotice('QR image preview loaded and active! Enter your GitHub token below to store this QR permanently in your GitHub repository.');
      }
    };

    reader.readAsDataURL(file);
  };

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
      githubQrPath: undefined,
      githubCommitUrl: undefined
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Save changes
  const handleSaveEdit = async (e: React.FormEvent) => {
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

    // If GitHub token is present, sync configuration to GitHub repository
    const currentConfig = getStoredGithubConfig();
    if (currentConfig.token) {
      try {
        await commitSupportConfigToGitHub(editForm, 'Update creator support config in GitHub', currentConfig);
      } catch (e) {
        console.warn('Could not sync support config JSON to GitHub:', e);
      }
    }

    setIsEditing(false);
    setSaveSuccessNotice('Support creator details and QR code updated successfully!');
    setTimeout(() => setSaveSuccessNotice(null), 3000);
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
                  <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Creator QR</span>
                  </span>
                )}
                {supportConfig.githubQrPath && !isEditing && (
                  <span className="text-[10px] font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                    <Github className="w-3 h-3" />
                    <span>GitHub Stored</span>
                  </span>
                )}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {isEditing ? 'Upload QR code image to GitHub and customize payment information' : 'Help keep interactive HTML quizzes 100% free & open'}
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
                title={isEditing ? "Switch to preview view" : "Upload QR code to GitHub and edit payee info"}
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
              <span>{saveSuccessNotice}</span>
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

              {/* GitHub Storage Info Banner */}
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 rounded-xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-blue-900 dark:text-blue-200">
                    <Github className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Store QR Code in GitHub Repository</span>
                  </div>
                  <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                    {ghConfig.owner}/{ghConfig.repo}
                  </span>
                </div>
                <p className="text-[11.5px] text-blue-800/90 dark:text-blue-300 leading-relaxed">
                  When you upload your QR code image, it will be committed directly to your GitHub repository under <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded text-[11px]">assets/creator_qr.*</code> so it is permanently preserved and visible to everyone.
                </p>

                {/* If GitHub token missing or inline token config requested */}
                {(!ghConfig.token || showPatField) && (
                  <div className="pt-2 border-t border-blue-200/60 dark:border-blue-900/60 space-y-2">
                    <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 text-[11.5px] font-medium">
                      <Key className="w-3.5 h-3.5" />
                      <span>GitHub Personal Access Token (PAT) needed for direct commits:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="password"
                        value={patInput}
                        onChange={(e) => setPatInput(e.target.value)}
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (repo scope)"
                        className="flex-1 px-3 py-1.5 bg-white dark:bg-[#1a1a1a] border border-blue-300 dark:border-blue-700 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleSavePatInline}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors"
                      >
                        Save Token
                      </button>
                      {onOpenAdminConfig && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenAdminConfig();
                          }}
                          className="px-2.5 py-1.5 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 rounded-lg text-xs text-neutral-700 dark:text-neutral-200 font-medium shrink-0 transition-colors"
                        >
                          Advanced
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* QR Upload Section */}
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    Creator Payment / Bank QR Code Image
                  </label>
                  {isUploadingToGitHub && (
                    <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Committing to GitHub...</span>
                    </div>
                  )}
                </div>

                {editForm.customQrImageUrl ? (
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative group w-36 h-36 bg-white rounded-xl border-2 border-emerald-400 p-2 flex items-center justify-center shrink-0 shadow-xs">
                      <img 
                        src={editForm.customQrImageUrl} 
                        alt="QR Preview" 
                        className="max-w-full max-h-full object-contain rounded-lg"
                      />
                    </div>
                    <div className="flex-1 space-y-2 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>QR Image Ready</span>
                      </div>
                      <p className="text-[11px] text-neutral-500 leading-relaxed">
                        {editForm.githubQrPath ? (
                          <>Stored at path <code className="font-mono bg-neutral-200 dark:bg-neutral-700 px-1 py-0.5 rounded">{editForm.githubQrPath}</code> in GitHub repository.</>
                        ) : (
                          <>QR image loaded for preview. Save to commit to GitHub.</>
                        )}
                      </p>
                      <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingToGitHub}
                          className="px-3 py-1 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 transition-colors cursor-pointer"
                        >
                          Change QR Image
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveCustomQr}
                          disabled={isUploadingToGitHub}
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
                      {isDragOver ? 'Drop QR code image here' : 'Click or drop QR Code image to upload & store in GitHub'}
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
                    placeholder="e.g. Alexander R. Vance / Creator Name"
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
                    Bank / Institution / Service Name
                  </label>
                  <input
                    type="text"
                    value={editForm.bankName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, bankName: e.target.value }))}
                    placeholder="e.g. National Bank / ABA / PayPal / Wise"
                    className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    SWIFT / Note / Branch
                  </label>
                  <input
                    type="text"
                    value={editForm.swiftCode || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, swiftCode: e.target.value }))}
                    placeholder="Optional SWIFT or note"
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
                  placeholder="e.g. USD / International"
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
                    disabled={isUploadingToGitHub}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    {isUploadingToGitHub ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Storing in GitHub...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Save & Store Details</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* VIEW MODE: Supporters / Public View */
            <>
              {/* Creator Support Intro Message */}
              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200/80 dark:border-neutral-700/60 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                <p>{supportConfig.message || DEFAULT_CREATOR_SUPPORT.message}</p>
              </div>

              {/* Suggested Contribution Chips */}
              <div className="space-y-1.5">
                <span className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Suggested Contribution
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 5, 10, 25].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => {
                        playNavSound();
                        setSelectedAmount(amt);
                      }}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        selectedAmount === amt
                          ? 'bg-rose-600 text-white shadow-2xs scale-102'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      <Coffee className="w-3 h-3 text-neutral-400" />
                      <span>${amt}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* QR Code Display Card */}
              <div className="flex flex-col items-center justify-center p-5 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-xs">
                {/* Header Badge on QR Card */}
                <div className="w-full flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800 text-[11px] font-bold tracking-wider text-rose-600 uppercase">
                  <span className="flex items-center gap-1">
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Official Creator Payment QR</span>
                  </span>
                  <span className="text-neutral-400 font-mono text-[10px]">{supportConfig.currency}</span>
                </div>

                {/* Display QR: Custom Uploaded Image from GitHub/Local */}
                <div className="my-3 p-2 bg-white rounded-xl flex items-center justify-center min-h-[200px] w-full max-w-[240px]">
                  {supportConfig.customQrImageUrl ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={supportConfig.customQrImageUrl}
                        alt="Creator Payment QR"
                        className="w-52 h-52 object-contain rounded-lg shadow-2xs"
                        loading="eager"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.src.includes('/assets/creator_qr.jpg')) {
                            target.src = '/assets/creator_qr.jpg';
                          }
                        }}
                      />
                    </div>
                  ) : (
                    /* Clean Placeholder when no QR uploaded yet */
                    <div className="w-52 h-52 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl flex flex-col items-center justify-center p-4 text-center">
                      <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-2">
                        <QrCode className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        No QR Code Uploaded Yet
                      </span>
                      <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
                        The creator can upload a payment QR image to store directly on GitHub.
                      </p>
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => {
                            playNavSound();
                            setIsEditing(true);
                          }}
                          className="mt-3 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        >
                          Upload QR Image
                        </button>
                      ) : onOpenOwnerLogin ? (
                        <button
                          type="button"
                          onClick={() => {
                            playNavSound();
                            onClose();
                            onOpenOwnerLogin();
                          }}
                          className="mt-3 px-3 py-1 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Lock className="w-3 h-3" />
                          <span>Owner Login to Upload</span>
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400 font-medium pt-1 text-center">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Scan with Mobile Banking or Payment App</span>
                  </div>

                  {supportConfig.githubQrPath && (
                    <a
                      href={supportConfig.githubCommitUrl || `https://github.com/${ghConfig.owner}/${ghConfig.repo}/blob/main/${supportConfig.githubQrPath}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title="View uploaded QR code asset on GitHub"
                    >
                      <Github className="w-3 h-3 text-neutral-500" />
                      <span>Stored in GitHub: {supportConfig.githubQrPath}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
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
                      Bank / Service / Currencies
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
