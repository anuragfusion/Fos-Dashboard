import { useSearchParams } from 'react-router-dom';
import { useDash } from '../../App';
import { derive } from '../../lib/derive';
import { dlong } from '../../lib/dates';
import { TodayTab } from './TodayTab';
import { WindowTab } from './WindowTab';
import { RecurringTab } from './RecurringTab';

const TABS = ['today', 'window', 'recurring'] as const;
type Tab = (typeof TABS)[number];
const LABEL: Record<Tab, string> = { today: 'Today', window: 'Last 5 days', recurring: 'Recurring' };

export function BriefScreen() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab') as Tab | null;
  const tab: Tab = raw && TABS.includes(raw) ? raw : 'today';
  const { data } = useDash();
  if (!data) return null;
  const d = derive(data);

  const head = d.pastDue.length
    ? `${d.open.length} open item${d.open.length === 1 ? '' : 's'} — ${d.pastDue.length} past their deadline with no closure evidence.`
    : d.open.length
      ? `${d.open.length} open item${d.open.length === 1 ? '' : 's'}, none past deadline yet.`
      : 'Nothing is open on the board yet.';

  return (
    <div className="sheet">
      <div className="eyebrow">Brief · {dlong(data.today)}</div>
      <h1>{head}</h1>
      <p className="lede">
        Ranked items are capped at seven — the cap forces the ranking to be honest. Every item opens in place to the
        line a named person wrote. Where a pod did not report, this screen says unknown — it will not say no issues.
      </p>
      <div className="tabs">
        {TABS.map((k) => (
          <button
            key={k}
            type="button"
            className={tab === k ? 'on' : ''}
            onClick={() => setParams({ tab: k })}
          >
            {LABEL[k]}
          </button>
        ))}
      </div>
      {tab === 'today' && <TodayTab />}
      {tab === 'window' && <WindowTab />}
      {tab === 'recurring' && <RecurringTab />}
    </div>
  );
}
