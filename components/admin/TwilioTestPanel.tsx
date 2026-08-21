import { FormEvent, useState } from 'react';

const DEFAULT_MESSAGE = 'Goodcup SMS test: your admin portal is connected to Twilio. Reply STOP to opt out.';

export function TwilioTestPanel() {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;

    setSending(true);
    setResult(null);

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/twilio/test-message', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to: phone, message }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Unable to send the message.');

      setResult({
        kind: 'success',
        text: `Message accepted by Twilio (${data.status}). Message ID: ${data.messageSid}`,
      });
    } catch (error) {
      setResult({ kind: 'error', text: error instanceof Error ? error.message : 'Unable to send the message.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-950 px-6 py-5 text-white">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Twilio connection test</p>
          <h2 className="mt-1 text-2xl font-black">Send yourself a text</h2>
          <p className="mt-2 text-base leading-6 text-slate-300">Use your verified recipient number while the Twilio account is restricted.</p>
        </div>

        <form onSubmit={sendMessage} className="space-y-6 p-6">
          <div>
            <label htmlFor="twilio-test-phone" className="text-base font-black text-slate-800">Destination phone number</label>
            <input
              id="twilio-test-phone"
              type="tel"
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+14155552671"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-lg text-slate-950 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
            />
            <p className="mt-2 text-sm text-slate-500">Include the country code and the leading +. For a US number, use +1 followed by ten digits.</p>
          </div>

          <div>
            <div className="flex items-end justify-between gap-3">
              <label htmlFor="twilio-test-message" className="text-base font-black text-slate-800">Message</label>
              <span className="text-sm font-semibold text-slate-500">{message.length}/1600</span>
            </div>
            <textarea
              id="twilio-test-message"
              required
              maxLength={1600}
              rows={5}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-lg leading-7 text-slate-950 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
            />
          </div>

          {result && (
            <div role="status" className={`rounded-xl border px-4 py-3 text-base font-bold ${result.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900'}`}>
              {result.text}
            </div>
          )}

          <button type="submit" disabled={sending || !phone.trim() || !message.trim()} className="rounded-xl bg-emerald-700 px-6 py-3.5 text-base font-black text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
            {sending ? 'Sending…' : 'Send test message'}
          </button>
        </form>
      </div>
    </section>
  );
}
