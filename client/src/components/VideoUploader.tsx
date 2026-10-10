import { Check, FileVideo, ImagePlus, RefreshCw, UploadCloud, X } from "lucide-react";
import React, { ChangeEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Progress } from "./ui/progress";
import axiosInstance from "@/lib/axiosinstance";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/categories";
import { captureFrame } from "@/lib/captureFrame";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_DESCRIPTION = 5000;

const VideoUploader = ({ channelId, channelName, onUploaded }: any) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [thumbnail, setThumbnail] = useState<Blob | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isCustomThumbnail, setIsCustomThumbnail] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  // Keep a preview URL for whichever thumbnail is current.
  useEffect(() => {
    if (!thumbnail) {
      setThumbnailUrl(null);
      return;
    }
    const url = URL.createObjectURL(thumbnail);
    setThumbnailUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnail]);

  const generateThumbnail = async (file: File) => {
    setIsCapturing(true);
    const frame = await captureFrame(file);
    setIsCapturing(false);
    if (frame) {
      setThumbnail(frame);
      setIsCustomThumbnail(false);
    }
  };

  const selectFile = (file?: File) => {
    if (!file) return;
    if (file.type !== "video/mp4") {
      toast.error("Please upload an MP4 video file.");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error("File size exceeds 100MB limit.");
      return;
    }
    setVideoFile(file);
    if (!videoTitle) setVideoTitle(file.name.replace(/\.[^.]+$/, ""));
    generateThumbnail(file);
  };

  const handlefilechange = (e: ChangeEvent<HTMLInputElement>) => {
    selectFile(e.target.files?.[0]);
  };

  const handleThumbnailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      toast.error("Thumbnail must be a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Thumbnail must be smaller than 5MB.");
      return;
    }
    setThumbnail(file);
    setIsCustomThumbnail(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    selectFile(e.dataTransfer.files?.[0]);
  };

  const resetForm = () => {
    setVideoFile(null);
    setVideoTitle("");
    setDescription("");
    setCategory("");
    setThumbnail(null);
    setIsCustomThumbnail(false);
    setIsUploading(false);
    setUploadProgress(0);
    setUploadComplete(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const cancelUpload = () => {
    if (isUploading) toast.error("Your video upload has been cancelled");
    resetForm();
  };

  const handleUpload = async () => {
    if (!videoFile || !videoTitle.trim()) {
      toast.error("Please provide file and title");
      return;
    }
    if (!category) {
      toast.error("Please choose a category");
      return;
    }

    const formdata = new FormData();
    formdata.append("file", videoFile);
    formdata.append("videotitle", videoTitle.trim());
    formdata.append("videochanel", channelName);
    formdata.append("uploader", channelId);
    formdata.append("description", description.trim());
    formdata.append("category", category);
    if (thumbnail) {
      const name =
        thumbnail instanceof File ? thumbnail.name : "thumbnail.jpg";
      formdata.append("thumbnail", thumbnail, name);
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      await axiosInstance.post("/video/upload", formdata, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event: any) => {
          const progress = Math.round((event.loaded * 100) / event.total);
          setUploadProgress(progress);
        },
      });

      toast.success("Upload successful");
      resetForm();
      onUploaded?.();
    } catch (error) {
      console.error(error);
      toast.error("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const fieldClass = "rounded-xl border-white/10 bg-white/[0.03]";
  const locked = isUploading || uploadComplete;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-surface p-5 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold tracking-tight">Upload a video</h2>

      {!videoFile ? (
        <div
          role="button"
          tabIndex={0}
          className={cn(
            "group cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all",
            isDragging
              ? "border-brand/70 bg-brand/[0.06]"
              : "border-white/10 hover:border-white/25 hover:bg-white/[0.02]"
          )}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-white/[0.05] transition-transform group-hover:-translate-y-0.5">
            <UploadCloud className="size-7 text-muted-foreground" />
          </div>
          <p className="font-medium">Drag and drop a video file</p>
          <p className="mt-1 text-sm text-muted-foreground">
            or <span className="font-medium text-brand">browse</span> from your device
          </p>
          <p className="mt-4 text-xs text-muted-foreground/70">MP4 · Max 100MB</p>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4"
            className="hidden"
            onChange={handlefilechange}
          />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Details */}
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-sm">
                Title <span className="text-muted-foreground">(required)</span>
              </Label>
              <Input
                id="title"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="Give your video a title"
                maxLength={100}
                disabled={locked}
                className={cn("h-11", fieldClass)}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="description" className="text-sm">Description</Label>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {description.length}/{MAX_DESCRIPTION}
                </span>
              </div>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
                placeholder="Tell viewers about your video"
                disabled={locked}
                className={cn("min-h-[120px] resize-y", fieldClass)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-sm">
                Category <span className="text-muted-foreground">(required)</span>
              </Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={locked}
                className={cn(
                  "h-11 w-full appearance-none border px-3 text-sm outline-none transition-colors focus-visible:border-brand/50 focus-visible:ring-4 focus-visible:ring-brand/15",
                  fieldClass,
                  !category && "text-muted-foreground"
                )}
              >
                <option value="" disabled>
                  Choose a category
                </option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-popover text-foreground">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Thumbnail + file */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Thumbnail</Label>
              <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-surface-2">
                {thumbnailUrl ? (
                  <img src={thumbnailUrl} alt="Thumbnail preview" className="h-full w-full object-cover" />
                ) : (
                  <div className={cn("absolute inset-0", isCapturing && "skeleton")} />
                )}
                <span className="absolute left-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
                  {isCustomThumbnail ? "Custom" : isCapturing ? "Generating…" : "Auto"}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={locked}
                  onClick={() => thumbInputRef.current?.click()}
                  className="h-9 flex-1 gap-1.5 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                >
                  <ImagePlus className="size-4" />
                  Upload image
                </Button>
                {isCustomThumbnail && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={locked}
                    onClick={() => videoFile && generateThumbnail(videoFile)}
                    className="h-9 gap-1.5 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                    title="Use a frame from the video instead"
                  >
                    <RefreshCw className="size-4" />
                    Auto
                  </Button>
                )}
              </div>
              <input
                ref={thumbInputRef}
                type="file"
                accept={IMAGE_TYPES.join(",")}
                className="hidden"
                onChange={handleThumbnailChange}
              />
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
              <div className="bg-gradient-brand rounded-lg p-2">
                <FileVideo className="size-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{videoFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              {!isUploading && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={cancelUpload}
                  aria-label="Remove file"
                >
                  <X className="size-4" />
                </Button>
              )}
              {uploadComplete && (
                <div className="rounded-full bg-emerald-500/15 p-1">
                  <Check className="size-4 text-emerald-400" />
                </div>
              )}
            </div>
          </div>

          {/* Progress + actions */}
          <div className="space-y-4 lg:col-span-2">
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Uploading…</span>
                  <span className="tabular-nums">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                className="rounded-full px-5 hover:bg-white/[0.06]"
                onClick={cancelUpload}
              >
                Cancel
              </Button>
              <Button
                className="bg-gradient-brand rounded-full px-6 font-semibold text-white hover:opacity-95"
                onClick={handleUpload}
                disabled={isUploading || isCapturing || !videoTitle.trim() || !category}
              >
                {isUploading ? "Uploading…" : "Publish"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoUploader;
