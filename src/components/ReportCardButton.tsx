import { Flag } from "lucide-react";
import { useState } from "react";
import { useApp } from "../context/AppContext";
import { supabase } from "../lib/supabase";

export default function ReportCardButton({ cardId }: { cardId: string }) {
  const { language } = useApp();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const copy = {
    ru: { button: "Пожаловаться", title: "Сообщить о нарушении", reasons: ["Ложные данные", "Выдаёт себя за другого человека", "Запрещённая услуга", "Мошенничество", "Другое"], details: "Подробности", send: "Отправить жалобу", sent: "Жалоба принята. Профиль будет проверен.", close: "Закрыть" },
    tj: { button: "Шикоят кардан", title: "Дар бораи қоидавайронкунӣ хабар диҳед", reasons: ["Маълумоти бардурӯғ", "Худро шахси дигар муаррифӣ мекунад", "Хизмати манъшуда", "Қаллобӣ", "Дигар"], details: "Тафсилот", send: "Фиристодани шикоят", sent: "Шикоят қабул шуд ва профил санҷида мешавад.", close: "Пӯшидан" },
    en: { button: "Report", title: "Report a violation", reasons: ["False information", "Impersonation", "Prohibited service", "Fraud", "Other"], details: "Details", send: "Send report", sent: "Report received. The profile will be reviewed.", close: "Close" }
  }[language];

  return (
    <>
      <button type="button" className="profile-report-button" onClick={() => setOpen(true)}><Flag size={14} /> {copy.button}</button>
      {open && <div className="platform-modal" role="dialog" aria-modal="true">
        <form className="platform-modal-card" onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          if (supabase) {
            await supabase.rpc("submit_card_report", {
              target_card_id: cardId,
              report_reason: String(data.get("reason")),
              report_details: String(data.get("details"))
            });
          }
          setSent(true);
        }}>
          <div className="modal-head"><h2>{copy.title}</h2><button type="button" onClick={() => setOpen(false)}>×</button></div>
          {sent ? <div className="lead-success"><p>{copy.sent}</p><button type="button" className="button button-primary" onClick={() => setOpen(false)}>{copy.close}</button></div> : <div className="platform-form">
            <label><span>{copy.title}</span><select name="reason">{copy.reasons.map((reason) => <option key={reason}>{reason}</option>)}</select></label>
            <label><span>{copy.details}</span><textarea name="details" rows={4} /></label>
            <button className="button button-primary" type="submit">{copy.send}</button>
          </div>}
        </form>
      </div>}
    </>
  );
}
