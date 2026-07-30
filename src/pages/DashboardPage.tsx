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
  UsersRound,
  ShieldCheck,
  ShoppingBag,
  Bell,
  ExternalLink,
  LogOut
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { cardRepository } from "../lib/cardRepository";
import { downloadQrCode, formatDate, themeColors } from "../lib/cardUtils";
import type { DigitalCard } from "../types/card";
import { leadRepository } from "../lib/leadRepository";
import { publicSiteUrl } from "../lib/siteUrl";
import { promoRepository, type LaunchPromoStatus } from "../lib/promoRepository";
import { supabase } from "../lib/supabase";

interface DashboardNotification {
  id: string;
  title: string;
  body: string;
  kind: string;
  action_url: string | null;
  read_at: string | null;
}

const getCardUrl = (slug: string) => {
  return publicSiteUrl(`/card/${slug}`);
};

const avatarText = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const withoutDemoCards = (cards: DigitalCard[]) =>
  cards.filter((card) => !card.id.startsWith("demo-"));

export default function DashboardPage() {
  const { t, language } = useApp();
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [cards, setCards] = useState<DigitalCard[]>([]);
  const [toast, setToast] = useState("");
  const [promo, setPromo] = useState<LaunchPromoStatus | null>(null);
  const [latestNotification, setLatestNotification] = useState<DashboardNotification | null>(null);
  const leads = leadRepository.list();
  const dashboardCopy = {
    ru: { clients: "Клиенты", newLeads: "Новые лиды", crm: "Мини-CRM Vizora", crmText: "Обращения из публичных визиток, статусы, заметки и оплата", openLeads: "Открыть лиды", publish: "Отправить на проверку", pending: "На проверке", approved: "Опубликована", draft: "Черновик", changesRequested: "Требуются исправления", rejected: "Отклонена", suspended: "Заблокирована", lockedActions: "QR-код и публичная ссылка появятся после одобрения.", account: "Личный аккаунт", positionEmpty: "Должность пока не указана", organizationEmpty: "Организация пока не указана", viewCard: "Открыть визитку", notifications: "Уведомления", logout: "Выйти", myCards: "Мои визитки", myCardsText: "Создавайте, редактируйте и управляйте своими электронными визитками.", accountEmail: "Email аккаунта" },
    tj: { clients: "Мизоҷон", newLeads: "Дархостҳои нав", crm: "Мини-CRM Vizora", crmText: "Дархостҳо аз варақаҳои оммавӣ, ҳолатҳо, қайдҳо ва пардохт", openLeads: "Кушодани дархостҳо", publish: "Ба санҷиш фиристодан", pending: "Дар санҷиш", approved: "Нашр шудааст", draft: "Нусхаи муваққатӣ", changesRequested: "Ислоҳ талаб мешавад", rejected: "Рад шудааст", suspended: "Манъ шудааст", lockedActions: "QR-код ва пайванди оммавӣ пас аз тасдиқ дастрас мешаванд.", account: "Ҳисоби шахсӣ", positionEmpty: "Вазифа ҳоло нишон дода нашудааст", organizationEmpty: "Ташкилот ҳоло нишон дода нашудааст", viewCard: "Кушодани варақа", notifications: "Огоҳиномаҳо", logout: "Баромадан", myCards: "Варақаҳои ман", myCardsText: "Варақаҳои электронии худро созед, таҳрир ва идора намоед.", accountEmail: "Почтаи ҳисоб" },
    en: { clients: "Clients", newLeads: "New leads", crm: "Vizora mini CRM", crmText: "Public-card enquiries, statuses, notes and payments", openLeads: "Open leads", publish: "Submit for review", pending: "Under review", approved: "Published", draft: "Draft", changesRequested: "Changes required", rejected: "Rejected", suspended: "Suspended", lockedActions: "The QR code and public link will become available after approval.", account: "Personal account", positionEmpty: "Position not specified yet", organizationEmpty: "Organization not specified yet", viewCard: "Open card", notifications: "Notifications", logout: "Sign out", myCards: "My business cards", myCardsText: "Create, edit and manage your digital business cards.", accountEmail: "Account email" }
  }[language];

  useEffect(() => {
    let active = true;
    void cardRepository.listRemote().then((result) => {
      if (active) setCards(withoutDemoCards(result));
    });
    void promoRepository.status().then((result) => {
      if (active) setPromo(result);
    }).catch(() => undefined);
    if (supabase) {
      void supabase
        .from("notifications")
        .select("id,title,body,kind,action_url,read_at")
        .eq("kind", "card_review")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (active && data) setLatestNotification(data as DashboardNotification);
        });
    }
    return () => { active = false; };
  }, []);

  const totalViews = cards.reduce((sum, card) => sum + card.views, 0);
  const activeCards = cards.filter((card) => card.reviewStatus === "approved").length;
  const primaryCard = cards[0];
  const accountName =
    primaryCard?.fullName ||
    profile?.fullName ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Vizora";
  const accountPhoto = primaryCard?.photo ?? "";
  const accountPosition = primaryCard?.position || dashboardCopy.positionEmpty;
  const accountOrganization =
    primaryCard?.organization || dashboardCopy.organizationEmpty;

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const copyLink = async (card: DigitalCard) => {
    await navigator.clipboard.writeText(getCardUrl(card.slug));
    notify(t("copied"));
  };

  const remove = async (card: DigitalCard) => {
    if (!window.confirm(t("confirmDelete"))) return;
    const result = await cardRepository.remove(card.id);
    if (result.ok) {
      setCards((items) => items.filter((item) => item.id !== card.id));
    }
    notify(result.message);
  };

  const statusLabel = (status: DigitalCard["reviewStatus"]) => {
    if (status === "approved") return dashboardCopy.approved;
    if (status === "pending") return dashboardCopy.pending;
    if (status === "changes_requested") return dashboardCopy.changesRequested;
    if (status === "rejected") return dashboardCopy.rejected;
    if (status === "suspended") return dashboardCopy.suspended;
    return dashboardCopy.draft;
  };

  const leaveAccount = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <main className="dashboard-page">
      <section className="dashboard-hero">
        <div className="site-container py-12 md:py-16">
          <div className="dashboard-profile-panel">
            <div className="dashboard-profile-identity">
              {accountPhoto ? (
                <img src={accountPhoto} alt={accountName} />
              ) : (
                <span>{avatarText(accountName)}</span>
              )}
              <div>
                <small>{dashboardCopy.account}</small>
                <h2>{accountName}</h2>
                <p>{accountPosition} <b>·</b> {accountOrganization}</p>
                <em>{dashboardCopy.accountEmail}: {profile?.email || user?.email}</em>
              </div>
            </div>
            <div className="dashboard-profile-actions">
              {primaryCard && (
                <Link to={`/card/${primaryCard.slug}`} className="button button-secondary">
                  <ExternalLink size={16} /> {dashboardCopy.viewCard}
                </Link>
              )}
              <Link to="/notifications" className="button button-secondary">
                <Bell size={16} /> {dashboardCopy.notifications}
              </Link>
              <button type="button" className="button dashboard-logout" onClick={() => void leaveAccount()}>
                <LogOut size={16} /> {dashboardCopy.logout}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <span className="section-label">{t("dashboardEyebrow")}</span>
              <h1 className="page-title">{t("dashboardTitle")}</h1>
              <p className="page-copy">{t("dashboardText")}</p>
            </div>
            <Link
              to="/create"
              className="button button-primary button-large shrink-0"
            >
              {primaryCard ? <ShieldCheck size={19} /> : <Plus size={19} />}
              {primaryCard ? statusLabel(primaryCard.reviewStatus) : t("create")}
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
              <div><strong>{activeCards}</strong><small>{t("activeCards")}</small></div>
            </article>
            <article>
              <span><UsersRound size={20} /></span>
              <div><strong>{leads.length}</strong><small>{dashboardCopy.clients}</small></div>
            </article>
            <article>
              <span><MessageSquareText size={20} /></span>
              <div><strong>{leads.filter((lead) => lead.status === "new").length}</strong><small>{dashboardCopy.newLeads}</small></div>
            </article>
          </div>
        </div>
      </section>

      <section className="site-container py-10 md:py-14">
        {latestNotification && !latestNotification.read_at && (
          <div className="dashboard-review-notice">
            <span><Bell size={22} /></span>
            <div>
              <strong>{latestNotification.title}</strong>
              <p>{latestNotification.body}</p>
            </div>
            <Link
              to={latestNotification.action_url || "/notifications"}
              className="button button-secondary"
              onClick={() => {
                if (supabase) {
                  void supabase
                    .from("notifications")
                    .update({ read_at: new Date().toISOString() })
                    .eq("id", latestNotification.id);
                }
                setLatestNotification((item) => item ? { ...item, read_at: new Date().toISOString() } : item);
              }}
            >
              {language === "ru" ? "Посмотреть" : language === "tj" ? "Дидан" : "View"}
            </Link>
          </div>
        )}
        <div className="dashboard-crm-banner">
          <div><MessageSquareText size={22} /><span><strong>{dashboardCopy.crm}</strong><small>{dashboardCopy.crmText}</small></span></div>
          <Link to="/dashboard/leads" className="button button-secondary">{dashboardCopy.openLeads}</Link>
        </div>
        <div className="dashboard-crm-banner mt-3">
          <div><ShoppingBag size={22} /><span><strong>{language === "ru" ? "Заказы и договоры" : language === "tj" ? "Фармоишҳо ва шартномаҳо" : "Orders and contracts"}</strong><small>{language === "ru" ? "Статусы изготовления, оплаты и документы" : language === "tj" ? "Ҳолати омодасозӣ, пардохт ва ҳуҷҷатҳо" : "Production, payment status and documents"}</small></span></div>
          <Link to="/dashboard/orders" className="button button-secondary">{language === "ru" ? "Открыть" : language === "tj" ? "Кушодан" : "Open"}</Link>
        </div>
        <div className="dashboard-crm-banner mt-3">
          <div><ShieldCheck size={22} /><span><strong>{language === "ru" ? "Проверка специалиста" : language === "tj" ? "Санҷиши мутахассис" : "Professional verification"}</strong><small>{language === "ru" ? "Подтвердите профессию перед публикацией в открытом каталоге" : language === "tj" ? "Пеш аз нашр касби худро тасдиқ кунед" : "Verify your profession before directory publication"}</small></span></div>
          <Link to="/verification" className="button button-secondary">{language === "ru" ? "Загрузить документы" : language === "tj" ? "Бор кардани ҳуҷҷатҳо" : "Upload documents"}</Link>
        </div>
        <div className="dashboard-section-head">
          <div>
            <span className="section-label">VIZORA.TJ</span>
            <h2>{dashboardCopy.myCards}</h2>
            <p>{dashboardCopy.myCardsText}</p>
          </div>
          <Link
            to="/create"
            className="button button-primary"
          >
            {primaryCard ? <ShieldCheck size={17} /> : <Plus size={17} />}
            {primaryCard ? statusLabel(primaryCard.reviewStatus) : t("create")}
          </Link>
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
                    <span className={`status-pill ${card.reviewStatus === "pending" ? "status-review" : ""}`}>
                      {statusLabel(card.reviewStatus)}
                    </span>
                    <span>{formatDate(card.updatedAt, language)}</span>
                  </div>

                  <div className="dashboard-card-actions">
                    <Link to={`/create?edit=${card.id}`} className="button button-secondary">
                      <Edit3 size={16} /> {t("edit")}
                    </Link>
                    {card.reviewStatus === "approved" ? (
                      <>
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
                      </>
                    ) : (
                      <span className="inline-flex max-w-[280px] items-center gap-2 text-xs font-bold leading-relaxed text-slate-500">
                        <ShieldCheck size={16} /> {dashboardCopy.lockedActions}
                      </span>
                    )}
                    {card.reviewStatus === "draft" && promo?.eligible && !promo.hasEntitlement && promo.remaining > 0 && (
                      <button
                        type="button"
                        className="button button-primary"
                        onClick={async () => {
                          try {
                            const result = await promoRepository.claim(card.id);
                            setPromo(result);
                            setCards((items) => items.map((item) =>
                              item.id === card.id ? { ...item, reviewStatus: "pending" } : item
                            ));
                            notify(dashboardCopy.pending);
                          } catch (error) {
                            notify(error instanceof Error ? error.message : "Не удалось применить акцию.");
                          }
                        }}
                      >
                        <ShieldCheck size={16} /> {language === "ru" ? "Использовать акцию" : language === "tj" ? "Истифодаи аксия" : "Use launch offer"}
                      </button>
                    )}
                    {card.reviewStatus === "draft" && !promo?.hasEntitlement && (
                      <Link to="/payment?plan=personal" className="button button-secondary">
                        {language === "ru" ? "Оплатить 20 с." : language === "tj" ? "Пардохт 20 с." : "Pay 20 TJS"}
                      </Link>
                    )}
                    {card.reviewStatus === "draft" && promo?.hasEntitlement && (
                      <button
                        type="button"
                        className="button button-primary"
                        onClick={async () => {
                          const result = await cardRepository.requestPublication(card.id);
                          notify(result.message);
                          if (result.ok) {
                            setCards((items) => items.map((item) =>
                              item.id === card.id ? { ...item, reviewStatus: "pending" } : item
                            ));
                          }
                        }}
                      >
                        <ShieldCheck size={16} /> {dashboardCopy.publish}
                      </button>
                    )}
                    {card.reviewStatus !== "approved" && card.reviewStatus !== "pending" && card.reviewStatus !== "draft" && (
                      <button
                        type="button"
                        className="button button-ghost"
                        onClick={async () => {
                          const result = await cardRepository.requestPublication(card.id);
                          notify(result.message);
                          if (result.ok) {
                            setCards((items) => items.map((item) =>
                              item.id === card.id ? { ...item, reviewStatus: "pending" } : item
                            ));
                          }
                        }}
                      >
                        <ShieldCheck size={16} /> {dashboardCopy.publish}
                      </button>
                    )}
                    <button
                      type="button"
                      className="icon-button text-red-600"
                      onClick={() => void remove(card)}
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
