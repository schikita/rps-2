import React from "react";
import type { User } from "../App";


interface Props {
  nickname: string;
  onSelect: (avatar: string) => void;
}

export const AvatarSelectScreen: React.FC<Props> = ({ nickname, onSelect }) => {
  const presetAvatars = [
    "/src/assets/avatars/skin-1.jpg",
    "/src/assets/avatars/2.png",
    "/src/assets/avatars/3.png",
    "/src/assets/avatars/4.png",
    "/src/assets/avatars/5.png",
    "/src/assets/avatars/6.png",
  ];

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
          {presetAvatars.map((src, i) => (
            <img
              key={i}
              src={src}
              className="avatar-option"
              onClick={() => onSelect(src)}
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
