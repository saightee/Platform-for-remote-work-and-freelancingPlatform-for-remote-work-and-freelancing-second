// import React from 'react';

// const Loader: React.FC = () => {
//   return (
//     <div className="loader-container">
//       <div className="loader"></div>
//     </div>
//   );
// };

// export default Loader;


import React from 'react';
import '../styles/loader.css';
import { brand } from '../brand';

type LoaderVariant = 'wordmark' | 'typing' | 'anvil' | 'bar';
type LoaderSize = 'sm' | 'md' | 'lg';

interface Props {
  variant?: LoaderVariant;     // какой вариант анимации показать
  size?: LoaderSize;           // размер визуала
  whiteBackdrop?: boolean;     // белая подложка под лоадер
  brandColor?: string;         // если хочешь принудительно задать цвет текста (иначе берётся из CSS переменной)
}

const Loader: React.FC<Props> = ({
  variant = 'wordmark',
  size = 'md',
  whiteBackdrop = false,
  brandColor,
}) => {
  // Позволяем переопределять цвет через инлайн-стиль, если нужно
  const style = brandColor ? ({ ['--jf-brand' as any]: brandColor } as React.CSSProperties) : undefined;

  return (
    <div className={`loader-container ${whiteBackdrop ? 'is-white' : ''}`} style={style}>
      {variant === 'wordmark' && (
        <div className={`jf-ldr jf-ldr--${size}`} role="status" aria-label="Loading">
          <div className="jf-ldr-wordmark">
            {/* ТЕКСТ — один цвет, без градиентов */}
            <span className="jf-wm-text">{brand.name}</span>
            {/* «Подчёркивание» — живёт своей жизнью, но не трогаем буквы */}
            <span className="jf-wm-underscore" aria-hidden="true" />
          </div>
        </div>
      )}

      {variant === 'typing' && (
        <div className={`jf-ldr jf-ldr--${size}`} role="status" aria-label="Loading">
          <div className="jf-ldr-typing">
            <span className="jf-typing" data-text={brand.name}>{brand.name}</span>
            <span className="jf-caret">_</span>
          </div>
        </div>
      )}

      {variant === 'anvil' && (
        <div className={`jf-ldr jf-ldr--${size}`} role="status" aria-label="Loading">
          <div className="jf-ldr-anvil">
            <svg className="jf-anvil" viewBox="0 0 120 60" aria-hidden="true">
              <path d="M8 40h68c6 0 11-5 11-11v-2h23v-8H87v-2c0-6-5-11-11-11H8v10h18c3 0 5 2 5 5s-2 5-5 5H8v14z"
                    fill="var(--jf-brand)"/>
              <path d="M8 16h28c1 0 2 1 2 2H8v-2z" fill="rgba(255,255,255,.55)"/>
            </svg>
            <svg className="jf-hammer" viewBox="0 0 60 60" aria-hidden="true">
              <rect x="26" y="6" width="8" height="24" rx="2" fill="#2d3a6b"/>
              <rect x="18" y="0" width="24" height="10" rx="3" fill="var(--jf-brand)"/>
            </svg>
            <div className="jf-spark s1" />
            <div className="jf-spark s2" />
            <div className="jf-spark s3" />
          </div>
          <div className="jf-ldr-caption">Forging your feed…</div>
        </div>
      )}

      {variant === 'bar' && (
        <div className={`jf-ldr jf-ldr--${size}`} role="status" aria-label="Loading">
          <div className="jf-ldr-bar">
            {/* ТЕКСТ — один цвет */}
             <div className="jf-bar-title">{brand.wordmark}</div>
            <div className="jf-bar-track">
              <div className="jf-bar-fill" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Loader;
