import React from "react";

// --- NO IMPORTS NEEDED ---
const PRESET_AVATARS = [
  "/avatars/boy.jpg",
  "/avatars/cyber.jpg",
  "/avatars/princessDune.jpg",
  "/avatars/roboCop.jpg",
];

interface Props {
  nickname: string;
  onSelect: (avatar: string) => void;
}

export const AvatarSelectScreen: React.FC<Props> = ({ nickname, onSelect }) => {

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      onSelect(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="app-root">
      <div className="app-gradient-bg" />
      <div className="app-content">
        <h2 className="logo-title">Выберите аватар</h2>
        <p className="logo-subtitle">{nickname}</p>

        <div className="avatar-grid">
          {PRESET_AVATARS.map((src, i) => (
            <img
              key={i}
              src={src}
              className="avatar-option"
              onClick={() => onSelect(src)}
              alt={`Avatar ${i}`}
            />
          ))}
        </div>

        <div className="upload-block">
          <label className="upload-label">
            Загрузить свой
            <input type="file" accept="image/*" onChange={handleUpload} hidden />
          </label>
        </div>
      </div>
    </div>
  );
};