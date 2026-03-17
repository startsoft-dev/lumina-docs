import React, {useState, useEffect, useCallback} from 'react';
import {createPortal} from 'react-dom';
import useBaseUrl from '@docusaurus/useBaseUrl';

interface AIDownloadModalProps {
  onClose: () => void;
}

const LaravelIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.642 5.43a.364.364 0 01.014.1v5.149c0 .135-.073.26-.189.326l-4.323 2.49v4.934c0 .135-.073.26-.189.326l-9.037 5.206a.35.35 0 01-.063.03c-.011.003-.021.01-.032.013a.366.366 0 01-.192 0c-.014-.004-.027-.012-.04-.018a.228.228 0 01-.053-.024L.534 18.652a.376.376 0 01-.189-.326V3.733c0-.034.005-.068.014-.1.003-.012.01-.023.015-.034.006-.014.012-.027.021-.04.007-.011.016-.021.025-.032.009-.013.018-.025.029-.035l.015-.013.033-.025.02-.01L4.87.958a.368.368 0 01.378 0L9.58 3.444l.02.01.033.025.015.013c.011.01.02.022.03.035.008.011.017.021.024.032.009.013.015.026.021.04.005.011.012.022.015.034a.364.364 0 01.014.1v9.652l3.76-2.164V6.129c0-.034.005-.068.014-.1.003-.012.01-.023.015-.034.006-.014.012-.027.021-.04a.304.304 0 01.024-.032c.01-.013.02-.025.03-.035l.015-.013.033-.025.02-.01 4.333-2.486a.37.37 0 01.377 0l4.333 2.486.02.01.033.025.015.013c.011.01.02.022.03.035.008.011.017.021.024.032.009.013.015.026.021.04.005.011.012.022.015.034zM23.2 10.494V6.068l-1.58.908-2.18 1.256v4.427l3.76-2.165zm-4.138 7.106V13.18l-2.146 1.225-6.001 3.427v4.47l8.147-4.696zM1.099 4.272v14.02l8.147 4.696v-4.47L5.504 16.35c-.011-.007-.018-.017-.029-.024-.01-.008-.022-.013-.032-.022l-.013-.015a.278.278 0 01-.029-.036.19.19 0 01-.021-.039c-.006-.013-.014-.024-.018-.038a.38.38 0 01-.012-.1V6.437L3.17 5.18l-1.58-.908h-.49zM5.06 1.712L1.29 3.883l3.768 2.17 3.768-2.17-3.767-2.171zm1.957 11.283l2.18-1.256V4.272l-1.58.908-2.18 1.256v7.467l1.58-.908zm6.635-9.112l-3.768 2.17 3.768 2.17 3.768-2.17-3.768-2.17zm-.378 4.87L11.12 7.5v4.427l2.18 1.256 1.58.908V9.664l-1.58-.908-.045-.003zM18.275 8.044l-3.768 2.17 3.768 2.17 3.768-2.17-3.768-2.17zm-.378 4.87l-2.18-1.256-1.58-.908v4.427l2.18 1.256 1.58.908V12.914z" />
  </svg>
);

const AdonisIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0L1.5 6v12L12 24l10.5-6V6L12 0zm0 2.18L20.16 7 12 11.82 3.84 7 12 2.18zM3 8.32l8.25 4.75v9.12L3 17.44V8.32zm9.75 13.87V13.07L21 8.32v9.12l-8.25 4.75z" />
  </svg>
);

const RailsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3.07 11.113L1.395 20.66h4.678L7.74 11.113H3.07zm4.832 0l-1.677 9.547h4.678l1.667-9.547H7.902zm4.832 0l-1.677 9.547h4.678l1.667-9.547h-4.668zm4.832 0l-1.677 9.547h4.678L22.244 11.113h-4.678zM4.744 3.34L3.394 9.933h4.68L9.413 3.34H4.744zm4.835 0l-1.34 6.593h4.68l1.34-6.593H9.579zm4.835 0l-1.34 6.593h4.68l1.34-6.593h-4.68zm4.835 0l-1.34 6.593h4.68l1.34-6.593h-4.68z" />
  </svg>
);

const stacks = [
  {
    id: 'server',
    name: 'Laravel (PHP)',
    icon: LaravelIcon,
    description: 'Complete Lumina reference for Laravel projects',
    skillPath: '/skills/server/SKILL.md',
  },
  {
    id: 'adonis-server',
    name: 'AdonisJS (TypeScript)',
    icon: AdonisIcon,
    description: 'Complete Lumina reference for AdonisJS projects',
    skillPath: '/skills/adonis-server/SKILL.md',
  },
  {
    id: 'rails',
    name: 'Rails (Ruby)',
    icon: RailsIcon,
    description: 'Complete Lumina reference for Rails projects',
    skillPath: '/skills/rails/SKILL.md',
  },
];

export default function AIDownloadModal({
  onClose,
}: AIDownloadModalProps): React.ReactNode {
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const baseUrl = useBaseUrl('/');

  const handleDownload = useCallback(
    (stackId: string, skillPath: string) => {
      setIsDownloading(stackId);
      try {
        const url = `${baseUrl}${skillPath.replace(/^\//, '')}`;
        window.open(url, '_blank', 'noopener');
      } catch (e) {
        console.error('Failed to open skill:', e);
      } finally {
        setIsDownloading(null);
      }
    },
    [baseUrl],
  );

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return createPortal(
    <div className="ai-modal-overlay" onClick={onClose}>
      <div className="ai-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ai-modal__header">
          <h2 className="ai-modal__title">Use Lumina in your AI</h2>
          <button className="ai-modal__close" onClick={onClose} title="Close">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className="ai-modal__desc">
          Select your tech stack to get the complete Lumina reference for your AI
          coding assistant. The file opens in a new tab — paste it into your AI
          context.
        </p>

        <div className="ai-modal__platforms">
          {stacks.map((s) => (
            <button
              key={s.id}
              className="ai-modal__platform"
              disabled={isDownloading !== null}
              onClick={() => handleDownload(s.id, s.skillPath)}>
              <div className="ai-modal__platform-icon">
                <s.icon />
              </div>
              <div className="ai-modal__platform-info">
                <span className="ai-modal__platform-name">{s.name}</span>
                <span className="ai-modal__platform-desc">
                  {s.description}
                </span>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ai-modal__platform-arrow">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
