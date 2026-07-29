import {
  BarChart3,
  Check,
  Copy,
  Edit3,
  Eye,
  MoreHorizontal,
  Plus,
  QrCode,
  Trash2,
  MessageSquareText,
  UsersRound
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useApp } from "../context/AppContext";
import { cardRepository } from "../lib/cardRepository";
import { downloadQrCode, formatDate, themeColors } from "../lib/cardUtils";
import type { DigitalCard } from "../types/card";
import { leadRepository } from "../lib/leadRepository";

const getCardUrl = (slug: string) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${window.location.origin}${base}/card/${slug}`;
};

const avatarText = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export default function DashboardPage() {
  const { t, language } = useApp();
  const [cards, setCards] = useState<DigitalCard[]>(() => cardRepository.list());
  const [toast, setToast] = useState("");
  const leads = leadRepository.list();

  useEffect(() => {
    let active = true;
    void cardRepository.listRemote().then((result) => {
      if (active) setCards(result);
    });
    return () => { active = false; };
  }, []);

  const totalViews = cards.reduce((sum, card) => sum + card.views, 0);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const copyLink = async (card: DigitalCard) => {
    await navigator.clipboard.writeText(getCardUrl(card.slug));
    notify(t("copied"));
  };

  const remove = (card: DigitalCard) => {
    if (!window.confirm(t("confirmDelete"))) return;
    cardRepository.remove(card.id);
    setCards(cardRepository.list());
  };

  return (
    <main className="dashboard-page">
      <section className="dashboard-hero">
        <div className="site-container py-12 md:py-16">
          <div className="flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <span className="section-label">{t("dashboardEyebrow")}</span>
              <h1 className="page-title">{t("dashboardTitle")}</h1>
              <p className="page-copy">{t("dashboardText")}</p>
            </div>
            <Link to="/create" className="button button-primary button-large shrink-0">
              <Plus size={19} /> {t("create")}
            </Link>
          </div>

          <div className="dashboard-stats">
            <article>
              <span><QrCode size={20} /></span>
              <div><strong>{cards.length}</strong><small>{t("totalCards")}</small></div>
            </article>
            <article>
              <span><Eye size={20} /></span>
              <div><strong>{totalViews.toLocaleString()}</strong><small>{t("totalViews")}</small></div>
            </article>
            <article>
              <span><Check size={20} /></span>
              <div><strong>{cards.length}</strong><small>{t("activeCards")}</small></div>
            </article>
            <article>
              <span><UsersRound size={20} /></span>
              <div><strong>{leads.length}</strong><small>Клиенты</small></div>
            </article>
            <article>
              <span><MessageSquareText size={20} /></span>
              <div><strong>{leads.filter((lead) => lead.status === "new").length}</strong><small>Новые лиды</small></div>
            </article>
          </div>
        </div>
      </section>

      <section className="site-container py-10 md:py-14">
        <div className="dashboard-crm-banner">
          <div><MessageSquareText size={22} /><span><strong>Мини-CRM Vizora</strong><small>Обращения из публичных визиток, статусы, заметки и оплата</small></span></div>
          <Link to="/dashboard/leads" className="button button-secondary">Открыть лиды</Link>
        </div>
        {cards.length ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {cards.map((card) => {
              const palette = themeColors[card.theme];
              return (
                <article key={card.id} className="dashboard-card">
                  <div
                    className="dashboard-card-accent"
                    style={{ backgroundColor: palette.accent }}
                  />
                  <div className="dashboard-card-head">
                    {card.photo ? (
                      <img src={card.photo} alt="" />
                    ) : (
                      <span style={{ backgroundColor: palette.soft, color: palette.accent }}>
                        {avatarText(card.fullName)}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <h2>{card.fullName}</h2>
                      <p>{card.position}{card.organization ? ` · ${card.organization}` : ""}</p>
                    </div>
                    <button type="button" className="icon-button" aria-label="Дополнительно">
                      <MoreHorizontal size={19} />
                    </button>
                  </div>

                  <Link to={`/card/${card.slug}`} className="dashboard-card-link">
                    <span>vizora.tj/{card.slug}</span>
                    <Eye size={16} />
                  </Link>

                  <div className="dashboard-card-meta">
                    <span><Eye size={15} /> {card.views.toLocaleString()} {t("views").toLowerCase()}</span>
                    <span>{formatDate(card.updatedAt, language)}</span>
                  </div>

                  <div className="dashboard-card-actions">
                    <Link to={`/create?edit=${card.id}`} className="button button-secondary">
                      <Edit3 size={16} /> {t("edit")}
                    </Link>
                    <button type="button" className="button button-ghost" onClick={() => copyLink(card)}>
                      <Copy size={16} /> {t("copyLink")}
                    </button>
                    <button
                      type="button"
                      className="button button-ghost"
                      onClick={() => downloadQrCode(getCardUrl(card.slug), card.slug)}
                    >
                      <QrCode size={16} /> QR
                    </button>
                    <button
                      type="button"
                      className="icon-button text-red-600"
                      onClick={() => remove(card)}
                      aria-label={t("delete")}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon"><BarChart3 size={26} /></div>
            <h2>{t("noCards")}</h2>
            <p>{t("noCardsText")}</p>
            <Link to="/create" className="button button-primary mt-6">
              <Plus size={18} /> {t("create")}
            </Link>
          </div>
        )}
      </section>

      {toast && <div className="toast"><Check size={17} /> {toast}</div>}
    </main>
  );
}
