import { useState } from 'react';
import { ArrowRight, Check, ChevronDown, TriangleAlert } from 'lucide-react';
import { getManifestReadings, MANIFEST_FIELDS, verifyManifest } from '../../data/departureManifest';
import type { ManifestDraft } from '../../data/departureManifest';

const manifestReadings = MANIFEST_FIELDS.map(getManifestReadings);

export default function ManifestWorkbench({ entries, onChange, onVerify }: {
  entries: ManifestDraft;
  onChange: (entries: ManifestDraft) => void;
  onVerify: () => void;
}) {
  const [checked, setChecked] = useState<ManifestDraft | null>(null);
  const selectedCount = MANIFEST_FIELDS.filter(({ id }) => entries[id]).length;
  const matchedCount = checked && MANIFEST_FIELDS.filter(({ id, answer }) => checked[id] === answer).length;

  return (
    <form className="manifest-workbench" onSubmit={(event) => {
      event.preventDefault();
      if (verifyManifest(entries)) onVerify();
      else setChecked(entries);
    }}>
      <header className="manifest-intro">
        <div><h3>复原发车清单</h3><p>初代接收器传回一张残缺的清单。用五起案件的现场读数填上空缺。</p></div>
        <strong aria-label={`已填 ${selectedCount}/${MANIFEST_FIELDS.length} 项`}>{selectedCount}/{MANIFEST_FIELDS.length}</strong>
      </header>
      <div className="manifest-slots">
        {MANIFEST_FIELDS.map((field, index) => {
          const readings = manifestReadings[index];
          const selection = readings.find(({ id }) => id === entries[field.id]);
          const assessed = Boolean(selection && checked?.[field.id] === selection.id);
          const matched = assessed && selection?.id === field.answer;
          const mismatch = assessed && !matched;
          const prompt = `manifest-${field.id}-prompt`;
          const review = `manifest-${field.id}-review`;
          return (
            <section key={field.id} className={`manifest-slot${matched ? ' is-matched' : ''}${mismatch ? ' needs-review' : ''}`}>
              <div className="manifest-slot-heading">
                <span>{field.caseName}</span>
                <label htmlFor={`manifest-${field.id}`}>{field.label}</label>
                <p id={prompt}>{field.prompt}</p>
              </div>
              <div>
                <div className="manifest-select">
                  <select id={`manifest-${field.id}`} name={field.id} value={entries[field.id] ?? ''}
                    aria-describedby={mismatch ? `${prompt} ${review}` : prompt}
                    onChange={(event) => {
                      if (assessed) setChecked((previous) => ({ ...previous, [field.id]: undefined }));
                      onChange({ ...entries, [field.id]: event.target.value });
                    }}>
                    <option value="">选择现场读数</option>
                    {readings.map((reading) => <option key={reading.id} value={reading.id}>{reading.label}</option>)}
                  </select>
                  <ChevronDown size={16} aria-hidden="true" />
                </div>
                {selection && (
                  <div className="manifest-reading">
                    <span>{selection.source} · {selection.time}</span>
                    <strong>{selection.value}</strong>
                  </div>
                )}
                {matched && <p className="manifest-match"><Check size={14} aria-hidden="true" /> 读数已核实</p>}
                {mismatch && <p className="manifest-review" id={review}><TriangleAlert size={15} aria-hidden="true" />{field.direction}</p>}
              </div>
            </section>
          );
        })}
      </div>
      {checked && <p className="manifest-result" role="status">已核实 {matchedCount}/{MANIFEST_FIELDS.length} 项。请复查标出的读数。</p>}
      <button className="case-submit manifest-verify" type="submit" disabled={selectedCount !== MANIFEST_FIELDS.length}>
        核验发车清单 <ArrowRight size={16} aria-hidden="true" />
      </button>
    </form>
  );
}
