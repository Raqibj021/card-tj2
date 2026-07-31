import {
  Bell, Building2, CheckCircle2, Clock3, CreditCard, FilePenLine, ShieldAlert
} from "lucide-react";
import { Link } from "react-router";
import { useApp } from "../context/AppContext";
import type { OrganizationApplication } from "../lib/organizationRepository";
import { useNotificationCounts } from "../hooks/useNotificationCounts";

interface OrganizationApplicationStatusProps {
  organization: OrganizationApplication;
  onEdit?: () => void;
}

export default function OrganizationApplicationStatus({
  organization,
  onEdit
}: OrganizationApplicationStatusProps) {
  const { language } = useApp();
  const { counts } = useNotificationCounts();
  const copy = {
    ru: {
      label: "Заявка организации", pending: "Ваша заявка на рассмотрении",
      pendingText: "Данные сохранены в вашем аккаунте. Повторно заполнять форму не нужно — решение администратора и его комментарий появятся в уведомлениях.",
      approved: "Организация одобрена",
      approvedText: "Рабочий кабинет открыт. Создавайте собственную структуру, добавляйте сотрудников и используйте общий QR-код.",
      changes: "Нужно уточнить данные",
      changesText: "Администратор оставил комментарий в уведомлениях. Исправьте заявку и отправьте её повторно.",
      rejected: "Заявка отклонена",
      rejectedText: "Причина решения доступна в уведомлениях. Вы можете исправить данные и подать заявку повторно.",
      suspended: "Организация временно приостановлена",
      suspendedText: "Откройте уведомления или свяжитесь с поддержкой, чтобы узнать причину.",
      plan: "Выбранный тариф", capacity: "Лимит сотрудников", open: "Открыть организацию",
      notifications: "Открыть уведомления", payment: "Перейти к оплате",
      paymentWaiting: "Оплата проверяется", paymentWaitingText: "Чек уже отправлен. Повторно оплачивать не нужно — дождитесь решения администратора.",
      approvedUnpaid: "Организация одобрена — активируйте тариф", approvedUnpaidText: "Проверка организации завершена. После подтверждения оплаты рабочий кабинет откроется автоматически.",
      edit: "Исправить заявку", employees: "сотрудников"
    },
    tj: {
      label: "Дархости ташкилот", pending: "Дархости шумо дар баррасӣ аст",
      pendingText: "Маълумот дар ҳисоби шумо нигоҳ дошта шуд. Шаклро дубора пур кардан лозим нест — қарор ва шарҳи администратор дар огоҳиҳо пайдо мешавад.",
      approved: "Ташкилот тасдиқ шуд",
      approvedText: "Кабинети корӣ кушода аст. Сохтори худро созед, кормандонро илова кунед ва QR-и умумиро истифода баред.",
      changes: "Маълумотро дақиқ кардан лозим",
      changesText: "Администратор дар огоҳиҳо шарҳ гузошт. Дархостро ислоҳ карда, дубора фиристед.",
      rejected: "Дархост рад шуд",
      rejectedText: "Сабаби қарор дар огоҳиҳо дастрас аст. Шумо метавонед маълумотро ислоҳ карда, дубора дархост диҳед.",
      suspended: "Фаъолияти ташкилот муваққатан боздошта шуд",
      suspendedText: "Огоҳиҳоро бинед ё бо дастгирӣ тамос гиред.",
      plan: "Тарофаи интихобшуда", capacity: "Ҳадди кормандон", open: "Кушодани ташкилот",
      notifications: "Кушодани огоҳиҳо", payment: "Гузаштан ба пардохт",
      paymentWaiting: "Пардохт санҷида мешавад", paymentWaitingText: "Расид аллакай фиристода шудааст. Дубора пардохт накунед — қарори администраторро интизор шавед.",
      approvedUnpaid: "Ташкилот тасдиқ шуд — тарофаро фаъол кунед", approvedUnpaidText: "Санҷиши ташкилот анҷом ёфт. Пас аз тасдиқи пардохт кабинети корӣ худкор кушода мешавад.",
      edit: "Ислоҳи дархост", employees: "корманд"
    },
    en: {
      label: "Organization application", pending: "Your application is under review",
      pendingText: "The application is saved in your account. You do not need to complete it again — the administrator’s decision and comment will appear in Notifications.",
      approved: "Organization approved",
      approvedText: "Your workspace is open. Build your structure, add employees and use the shared organization QR code.",
      changes: "Information needs clarification",
      changesText: "The administrator left a comment in Notifications. Correct the application and submit it again.",
      rejected: "Application rejected",
      rejectedText: "The reason is available in Notifications. You can correct the information and submit again.",
      suspended: "Organization temporarily suspended",
      suspendedText: "Open Notifications or contact support to see the reason.",
      plan: "Selected plan", capacity: "Employee limit", open: "Open organization",
      notifications: "Open notifications", payment: "Continue to payment",
      paymentWaiting: "Payment is being reviewed", paymentWaitingText: "Your receipt has already been submitted. Do not pay again — wait for the administrator’s decision.",
      approvedUnpaid: "Organization approved — activate the plan", approvedUnpaidText: "The organization review is complete. The workspace opens automatically after payment approval.",
      edit: "Correct application", employees: "employees"
    }
  }[language];

  const status = organization.reviewStatus;
  const approved = status === "approved";
  const tariffActive = approved && Boolean(organization.activeUntil) && new Date(organization.activeUntil as string).getTime() > Date.now();
  const paymentWaiting = organization.paymentStatus === "payment_pending" || organization.paymentStatus === "payment_review";
  const approvedUnpaid = approved && !tariffActive && !paymentWaiting;
  const changes = status === "changes_requested";
  const rejected = status === "rejected";
  const suspended = status === "suspended";
  const Icon = tariffActive ? CheckCircle2 : changes || rejected || suspended ? ShieldAlert : Clock3;
  const title = tariffActive ? copy.approved : paymentWaiting ? copy.paymentWaiting : approvedUnpaid ? copy.approvedUnpaid : changes ? copy.changes : rejected ? copy.rejected : suspended ? copy.suspended : copy.pending;
  const text = tariffActive ? copy.approvedText : paymentWaiting ? copy.paymentWaitingText : approvedUnpaid ? copy.approvedUnpaidText : changes ? copy.changesText : rejected ? copy.rejectedText : suspended ? copy.suspendedText : copy.pendingText;

  return (
    <section className={`organization-application-status status-${status}`}>
      <div className="organization-status-icon"><Icon size={30} /></div>
      <span className="section-label">{copy.label}</span>
      <h1>{title}</h1>
      <p>{text}</p>
      <div className="organization-status-summary">
        <span><Building2 size={18} /><b>{organization.displayName}</b></span>
        <span><CreditCard size={18} /><small>{copy.plan}</small><b>{organization.planCode || "Start"}</b></span>
        <span><Clock3 size={18} /><small>{copy.capacity}</small><b>{organization.employeeLimit} {copy.employees}</b></span>
      </div>
      <div className="organization-status-actions">
        {tariffActive && <Link className="button button-primary" to="/organization/dashboard">{copy.open}</Link>}
        {approvedUnpaid && (
          <Link className="button button-primary" to={`/payment?plan=${organization.planCode}&organization=${organization.id}`}>
            {copy.payment}
          </Link>
        )}
        {(changes || rejected) && onEdit && (
          <button type="button" className="button button-primary" onClick={onEdit}>
            <FilePenLine size={17} /> {copy.edit}
          </button>
        )}
        <Link className="button button-secondary" to="/notifications"><Bell size={17} /> {copy.notifications}{counts.all > 0 && <b className="button-notification-badge">{counts.all > 99 ? "99+" : counts.all}</b>}</Link>
      </div>
    </section>
  );
}
