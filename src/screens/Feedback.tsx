import React, { useState } from 'react';
import { PRIVACY_NOTE } from '../data/content';
import { COME_BACK, FEEDBACK_MAX, hasContactDetails, sendFeedback, type FeedbackForm } from '../services/feedback';

const COME_BACK_LABEL = { yes: 'Yes', maybe: 'Maybe', no: 'No' } as const;

export default function Feedback({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState<FeedbackForm>({ liked: '', confusing: '', comeBack: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const contact = hasContactDetails(form.liked) || hasContactDetails(form.confusing);
  const valid = !contact && (form.comeBack !== '' || form.liked.trim().length > 0 || form.confusing.trim().length > 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || status === 'sending') return;
    setStatus('sending');
    try {
      await sendFeedback(form);
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <div className="screen">
        <header className="screen-head">
          <div className="label accent">Field report received</div>
          <h1>Thank you. This shapes what we build next.</h1>
        </header>
        <button className="btn primary" onClick={onDone}>Back to Earth</button>
      </div>
    );
  }

  return (
    <div className="screen">
      <header className="screen-head">
        <div className="label accent">Field report</div>
        <h1>Tell us what you think</h1>
        <p className="muted">Plastic Pulse is still growing, and your answers decide what we build next. Three quick questions.</p>
      </header>

      <form className="glass panel form" onSubmit={submit}>
        <label htmlFor="fb-liked">What did you like?</label>
        <textarea id="fb-liked" rows={3} maxLength={FEEDBACK_MAX} value={form.liked} onChange={(e) => setForm({ ...form, liked: e.target.value })} />
        <label htmlFor="fb-confusing">What was confusing or annoying?</label>
        <textarea id="fb-confusing" rows={3} maxLength={FEEDBACK_MAX} value={form.confusing} onChange={(e) => setForm({ ...form, confusing: e.target.value })} />
        <fieldset className="choice-set">
          <legend>Would you open it again tomorrow?</legend>
          <div className="row tight">
            {COME_BACK.map((v) => (
              <button key={v} type="button" className={`btn ${form.comeBack === v ? 'primary' : 'ghost'}`} aria-pressed={form.comeBack === v} onClick={() => setForm({ ...form, comeBack: v })}>
                {COME_BACK_LABEL[v]}
              </button>
            ))}
          </div>
        </fieldset>
        <p className="note">Please don’t write your name, school or phone number. {PRIVACY_NOTE}</p>
        {contact && <p className="note warn-text" role="alert">Please remove email addresses, phone numbers and links. Feedback stays anonymous.</p>}
        {status === 'error' && <p className="note warn-text">Couldn’t send. Check your connection and try again.</p>}
        <div className="row">
          <button type="button" className="btn ghost" onClick={onDone}>Cancel</button>
          <button type="submit" className="btn primary" disabled={!valid || status === 'sending'}>{status === 'sending' ? 'Sending…' : 'Send'}</button>
        </div>
      </form>
    </div>
  );
}
