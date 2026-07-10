import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useSettings, ACCENTS, Accent } from '../store/settings';
import { useSleep } from '../store/sleep';
import { api } from '../api/client';
import { Icon } from '../components/icons';
import { MENU_ACTIONS } from '../lib/menuActions';

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return <button className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)}><span className="knob" /></button>;
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="segmented">
      {options.map(([v, label]) => (
        <button key={v} className={`seg ${value === v ? 'active' : ''}`} onClick={() => onChange(v)}>{label}</button>
      ))}
    </div>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="set-row">
      <div className="set-text">
        <div className="set-label">{label}</div>
        {desc && <div className="set-desc">{desc}</div>}
      </div>
      <div className="set-control">{children}</div>
    </div>
  );
}

export default function Settings() {
  const s = useSettings();
  const sleep = useSleep();
  const navigate = useNavigate();
  const [cleared, setCleared] = useState(false);

  return (
    <div className="settings-page">
      <div className="main-topbar">
        <button className="icon-btn" onClick={() => navigate(-1)}><Icon name="back" size={22} /></button>
        <h1 className="page-title">Settings</h1>
      </div>

      {/* Profile */}
      <div className="settings-section">
        <h2 className="settings-h">Profile</h2>
        <Row label="Your name" desc="Shown in the welcome line on Home (e.g. “Good evening, Teseo”)">
          <input className="set-input" type="text" maxLength={24} placeholder="Enter your name"
            value={s.displayName} onChange={(e) => s.set({ displayName: e.target.value })} />
        </Row>
        <Row label="Your stats" desc="Most-played songs and top artists">
          <button className="btn-ghost" onClick={() => navigate('/stats')}>Open</button>
        </Row>
      </div>

      {/* Appearance */}
      <div className="settings-section">
        <h2 className="settings-h">Appearance</h2>
        <Row label="Accent colour">
          <div className="swatches">
            {(Object.keys(ACCENTS) as Accent[]).map((a) => (
              <button key={a} className={`swatch ${s.accent === a ? 'active' : ''}`}
                style={{ background: `linear-gradient(135deg, ${ACCENTS[a][0]}, ${ACCENTS[a][1]})` }}
                onClick={() => s.set({ accent: a })} />
            ))}
          </div>
        </Row>
        <Row label="AMOLED black" desc="Pure-black background to save battery on OLED screens">
          <Toggle on={s.amoled} onChange={(v) => s.set({ amoled: v })} />
        </Row>
        <Row label="Reduce motion" desc="Turn off animations and transitions">
          <Toggle on={s.reduceMotion} onChange={(v) => s.set({ reduceMotion: v })} />
        </Row>
        <Row label="Colour from cover" desc="Tint the player to match the album art of the current song">
          <Toggle on={s.dynamicTheme} onChange={(v) => s.set({ dynamicTheme: v })} />
        </Row>
      </div>

      {/* Interface */}
      <div className="settings-section">
        <h2 className="settings-h">Interface</h2>
        <Row label="⋮ button on covers" desc="Long-press (phone) or right-click (laptop) also opens the menu">
          <Toggle on={s.showMenuButton} onChange={(v) => s.set({ showMenuButton: v })} />
        </Row>
        <Row label="Like button on songs" desc="Hide it and use the ⋮ menu to like instead">
          <Toggle on={s.showLikeOnRows} onChange={(v) => s.set({ showLikeOnRows: v })} />
        </Row>
        <Row label="Show scrollbars" desc="Visible scrollbars on shelves and lists">
          <Toggle on={s.showScrollbars} onChange={(v) => s.set({ showScrollbars: v })} />
        </Row>
        <Row label="Main scrollbar" desc="Show the scrollbar on the right of the page">
          <Toggle on={s.mainScrollbar} onChange={(v) => s.set({ mainScrollbar: v })} />
        </Row>
        <Row label="Compact rows" desc="Denser song lists (fit more on screen)">
          <Toggle on={s.compactRows} onChange={(v) => s.set({ compactRows: v })} />
        </Row>
        <Row label="Pull to refresh" desc="Swipe down at the top of Home to load a fresh feed">
          <Toggle on={s.pullToRefresh} onChange={(v) => s.set({ pullToRefresh: v })} />
        </Row>
      </div>

      {/* Song menu (hold a cover) */}
      <div className="settings-section">
        <h2 className="settings-h">Song menu</h2>
        <div className="set-desc" style={{ marginBottom: 6 }}>What appears when you long-press a song or cover.</div>
        <div className="set-sub">Big buttons · pick up to 3</div>
        <div className="chip-wrap">
          {MENU_ACTIONS.filter((a) => a.big).map((a) => {
            const on = s.menuBig.includes(a.key);
            return (
              <button key={a.key} className={`pick-chip ${on ? 'on' : ''}`}
                onClick={() => s.set({ menuBig: on ? s.menuBig.filter((k) => k !== a.key) : [...s.menuBig, a.key].slice(-3) })}>
                {a.label}
              </button>
            );
          })}
        </div>
        <div className="set-sub" style={{ marginTop: 14 }}>Options list</div>
        <div className="chip-wrap">
          {MENU_ACTIONS.map((a) => {
            const on = s.menuOptions.includes(a.key);
            return (
              <button key={a.key} className={`pick-chip ${on ? 'on' : ''}`}
                onClick={() => s.set({ menuOptions: on ? s.menuOptions.filter((k) => k !== a.key) : [...s.menuOptions, a.key] })}>
                {a.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Playback */}
      <div className="settings-section">
        <h2 className="settings-h">Playback</h2>
        <Row label="Autoplay radio" desc="When the queue ends, keep playing similar songs">
          <Toggle on={s.autoplay} onChange={(v) => s.set({ autoplay: v })} />
        </Row>
        <Row label="Default volume" desc={`${Math.round(s.defaultVolume * 100)}%`}>
          <input className="set-slider" type="range" min={0} max={1} step={0.05}
            value={s.defaultVolume} onChange={(e) => s.set({ defaultVolume: Number(e.target.value) })} />
        </Row>
        <Row label="Sleep timer" desc={sleep.endsAt ? 'Pausing soon…' : 'Pause playback after a while'}>
          <Segmented
            value={String(sleep.minutes)}
            options={[['0', 'Off'], ['15', '15m'], ['30', '30m'], ['60', '1h']]}
            onChange={(v) => sleep.arm(Number(v))}
          />
        </Row>
      </div>

      {/* Lyrics */}
      <div className="settings-section">
        <h2 className="settings-h">Lyrics</h2>
        <Row label="Sync offset" desc={`Highlight ${s.lyricOffset} ms ahead of the vocals`}>
          <input className="set-slider" type="range" min={-500} max={1500} step={50}
            value={s.lyricOffset} onChange={(e) => s.set({ lyricOffset: Number(e.target.value) })} />
        </Row>
        <Row label="Text size">
          <Segmented value={s.lyricSize} options={[['sm', 'S'], ['md', 'M'], ['lg', 'L']]} onChange={(v) => s.set({ lyricSize: v })} />
        </Row>
        <Row label="Animated notes" desc="Show bouncing notes during instrumental parts">
          <Toggle on={s.showNotes} onChange={(v) => s.set({ showNotes: v })} />
        </Row>
      </div>

      {/* Queue */}
      <div className="settings-section">
        <h2 className="settings-h">Queue</h2>
        <Row label="Behaviour" desc="Shrink as you scroll, or open/close it yourself (smoother)">
          <Segmented value={s.queueMode} options={[['manual', 'Manual'], ['shrink', 'Shrink']]} onChange={(v) => s.set({ queueMode: v })} />
        </Row>

        {s.queueMode === 'shrink' && (
          <>
            <Row label="Minimum size" desc={`${s.queueMinSize}px when scrolled down`}>
              <input className="set-slider" type="range" min={32} max={84} step={2}
                value={s.queueMinSize} onChange={(e) => s.set({ queueMinSize: Number(e.target.value) })} />
            </Row>
            <div className="queue-preview">
              <div className="qp-preview-label">Preview</div>
              <div className="qp-preview-row">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="qp-preview-cover" style={{ width: s.queueMinSize, height: s.queueMinSize }} />
                ))}
              </div>
            </div>
          </>
        )}

        {s.queueMode === 'manual' && (
          <>
            <Row label="Show title"><Toggle on={s.showQueueTitle} onChange={(v) => s.set({ showQueueTitle: v })} /></Row>
            <Row label="Show artist"><Toggle on={s.showQueueArtist} onChange={(v) => s.set({ showQueueArtist: v })} /></Row>
          </>
        )}
      </div>

      {/* Home feed */}
      <div className="settings-section">
        <h2 className="settings-h">Home feed</h2>
        <Row label="Quick picks"><Toggle on={s.showQuickPicks} onChange={(v) => s.set({ showQuickPicks: v })} /></Row>
        <Row label="Trending now"><Toggle on={s.showTrending} onChange={(v) => s.set({ showTrending: v })} /></Row>
        <Row label="New releases"><Toggle on={s.showNewReleases} onChange={(v) => s.set({ showNewReleases: v })} /></Row>
      </div>

      {/* Data */}
      <div className="settings-section">
        <h2 className="settings-h">Data</h2>
        <Row label="Listening history" desc="Clears “Recently played” and library-based suggestions">
          <button className="btn-ghost" onClick={async () => { await api.clearHistory(); setCleared(true); }}>
            {cleared ? 'Cleared' : 'Clear'}
          </button>
        </Row>
        <Row label="Reset settings" desc="Restore all settings to defaults">
          <button className="btn-ghost" onClick={() => s.reset()}>Reset</button>
        </Row>
      </div>

      <div className="settings-about">Sound Circle · your personal, ad-free player</div>
    </div>
  );
}
