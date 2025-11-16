import { useEffect } from "react";
import { motion } from "framer-motion";
import WebApp from "@twa-dev/sdk";

const choices = ["Камень", "Ножницы", "Бумага"];

export default function App() {
  useEffect(() => {
    try {
      WebApp.ready();
      WebApp.expand();
      WebApp.setHeaderColor("#050816");
      WebApp.setBackgroundColor("#050816");
    } catch {
      // Работаем и вне телеги — просто молча игнорируем
    }
  }, []);

  return (
    <div className="app-root">
      {/* Неоновый фон */}
      <div className="bg-grid" />
      <div className="bg-glow bg-glow-1" />
      <div className="bg-glow bg-glow-2" />

      <main className="content">
        <motion.h1
          className="title"
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          Cyber RPS
          <span className="title-sub">Камень · Ножницы · Бумага</span>
        </motion.h1>

        {/* Три персонажа */}
        <section className="characters">
          {[
            {
              name: "Человек",
              role: "Уличный игрок",
              color: "human",
              desc: "Ставит на интуицию и удачу.",
            },
            {
              name: "Робот-девушка",
              role: "Нейронный оракул",
              color: "android",
              desc: "Просчитывает тысячи исходов.",
            },
            {
              name: "Киборг",
              role: "Боевой тактик",
              color: "cyborg",
              desc: "Комбинирует мясо и металл.",
            },
          ].map((c, i) => (
            <motion.article
              key={c.name}
              className={`card card-${c.color}`}
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.15, duration: 0.5 }}
            >
              <div className="card-avatar" />
              <div className="card-body">
                <h2>{c.name}</h2>
                <p className="card-role">{c.role}</p>
                <p className="card-desc">{c.desc}</p>
              </div>
            </motion.article>
          ))}
        </section>

        {/* Панель выбора */}
        <motion.section
          className="panel"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <p className="panel-title">Сделай ход</p>
          <div className="buttons-row">
            {choices.map((c) => (
              <button
                key={c}
                className="btn-choice"
                onClick={() => {
                  // Тут потом прикрутим реальную логику
                  alert(`Ты выбрал: ${c}`);
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <p className="panel-hint">
            Далее можно будет добавить сетевую игру, рейтинг,
            Telegram-авторизацию и анимацию рук персонажей.
          </p>
        </motion.section>
      </main>
    </div>
  );
}
