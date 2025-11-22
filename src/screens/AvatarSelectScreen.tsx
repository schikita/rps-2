import React from "react";

// Импорты файлов — важно!
import skin1 from "../assets/avatars/skin-1.jpg";
import skin2 from "../assets/avatars/skin-2.jpg";
import skin3 from "../assets/avatars/skin-3.jpg";
import skin4 from "../assets/avatars/skin-4.jpg";
import skin5 from "../assets/avatars/skin-5.jpg";
import skin6 from "../assets/avatars/skin-6.jpg";

interface Props {
  nickname: string;
  onSelect: (avatar: string) => void;
}

export const AvatarSelectScreen: React.FC<Props> = ({ nickname, onSelect }) => {
  const presetAvatars: string[] = [skin1, skin2, skin3, skin4, skin5, skin6];

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
