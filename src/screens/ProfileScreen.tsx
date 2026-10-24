// Moi : ta progression (une seule vue : les compétences, par domaine) et tes réglages, rangés par groupes repliés.
// La gamification reste (niveau, série, badges) mais discrète : ici et dans le bilan de séance, jamais pendant un exercice.
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { InputMode, Instrument } from '../content/types';
import { BADGES } from '../content/badges';
import { degreeLabel, droneFor } from '../engine/music';
import { levelFromXp } from '../engine/xp';
import { areaProgress } from '../engine/progress';
import { AREAS, AREA_LABEL, type Area } from '../content/skills';
import { dayKey, lessonProgressOf, useUserStore } from '../store/useUserStore';
import { Radar } from '../components/Radar';
import { Button } from '../components/Button';
import { ConfirmBar } from '../components/ConfirmBar';
import { LatencyCalibration } from '../components/LatencyCalibration';
import { MicTest } from '../components/MicTest';
import { TUNINGS } from '../tuning';
import { WhatsNew } from '../components/WhatsNew';
import { RELEASES, VERSION_LABEL } from '../version';
import { FeedbackButton } from '../components/FeedbackButton';
import { useSyncState, type SyncState } from '../syncStatus';
import { audio } from '../audio/RNAudioEngine';
import { SHOW_TEST_TOOLS } from '../config';
import { colors, domainColor, setThemePref, themePref, type, type ThemePref } from '../theme';

const AREA_COLOR: Record<Area, string> = { oreille: domainColor.oreille, mains: domainColor.technique, lecture: domainColor.theorie, rythme: domainColor.rythme };

export function ProfileScreen() {
  const st = useUserStore();
  const lv = levelFromXp(st.xpTotal);
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={type.display}>Moi</Text>
        <View style={styles.levelRow}>
          <View style={styles.levelBadge}><Text style={styles.levelNum}>{lv.level}</Text></View>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={styles.bar}><View style={[styles.barFill, { width: `${((st.xpTotal - lv.current) / (lv.next - lv.current)) * 100}%` }]} /></View>
            <Text style={type.small}>Niveau {lv.level} · {st.xpTotal} XP · 🔥 {st.streak} jour{st.streak > 1 ? 's' : ''} (record {st.bestStreak}) · {st.sessionsDone} séance{st.sessionsDone > 1 ? 's' : ''}</Text>
          </View>
        </View>

        <Progress />

        <Group title="Ta séance" initiallyOpen>
          <Choice label="Durée" value={String(st.settings.sessionMinutes)} options={[10, 15, 20, 25, 30].map((m) => [String(m), `${m} min`] as [string, string])} onChange={(v) => st.setSettings({ sessionMinutes: Number(v) })} />
          <Choice label="Module technique" value={String(st.settings.techniqueMinutes ?? 0)} options={[['0', 'Non'], ['5', '+5 min'], ['10', '+10 min']]} onChange={(v) => st.setSettings({ techniqueMinutes: Number(v) as 0 | 5 | 10 })} />
          <Toggle label={`Je joue sur ${st.settings.instrument === 'guitare' ? 'ma guitare' : 'mon piano'} (l'appli m'écoute)`} value={st.settings.hasInstrument ?? true} onChange={(v) => st.setSettings({ hasInstrument: v })} />
          <Toggle label="Je peux chanter" value={st.settings.canSing ?? true} onChange={(v) => st.setSettings({ canSing: v })} />
        </Group>

        <Group title="Ton instrument">
          <Choice label="Instrument" value={st.settings.instrument} options={[['piano', 'Piano'], ['guitare', 'Guitare']]} onChange={(v) => st.setSettings({ instrument: v as Instrument, inputPref: v === 'guitare' ? 'manche' : 'clavier' })} />
          {st.settings.instrument === 'guitare' ? (
            <>
              <Choice label="Accordage" value={st.settings.tuning ?? 'standard'} options={Object.entries(TUNINGS).map(([k, t]) => [k, t.label.split(' (')[0]] as [string, string])} onChange={(v) => st.setSettings({ tuning: v })} />
              <Toggle label="Mode gaucher (manche inversé)" value={!!st.settings.lefty} onChange={(v) => st.setSettings({ lefty: v })} />
              <Choice label="Lecture" value={st.settings.guitarReading ?? 'portee'} options={[['portee', 'Portée'], ['tab', 'Tablature']]} onChange={(v) => st.setSettings({ guitarReading: v as 'portee' | 'tab' })} />
            </>
          ) : null}
          <Choice label="Réponse à l'écran ou au micro" value={st.settings.inputPref} options={[[st.settings.instrument === 'guitare' ? 'manche' : 'clavier', 'Écran'], ['micro', 'Micro']]} onChange={(v) => st.setSettings({ inputPref: v as InputMode })} />
          <Toggle label="Noms de notes au lieu des degrés" value={st.settings.showNoteNames} onChange={(v) => st.setSettings({ showNoteNames: v })} />
          <Choice label="Notation des accords" value={st.settings.chordNotation ?? 'maj7'} options={[['maj7', 'maj7, m7'], ['delta', 'Δ7, –7']]} onChange={(v) => st.setSettings({ chordNotation: v as 'maj7' | 'delta' })} />
          <Toggle label="Portée en direct (les notes jouées s'écrivent)" value={st.settings.liveStaff !== false} onChange={(v) => st.setSettings({ liveStaff: v })} />
        </Group>

        <Group title="Son et micro">
          <Choice label="Bourdon" value={String(st.settings.droneVolume ?? 0.6)} options={[['0.35', 'Doux'], ['0.6', 'Moyen'], ['0.9', 'Fort']]} onChange={(v) => {
            st.setSettings({ droneVolume: Number(v) });
            audio.droneVolume = Number(v);
            audio.init().then(() => { audio.startDrone(droneFor(st.settings.instrument === 'guitare' ? 45 : 60)); setTimeout(() => audio.stopDrone(), 1500); });
          }} />
          <MicTest gate={st.settings.micGate} onSave={(g) => st.setSettings({ micGate: g })} />
          <LatencyCalibration current={st.settings.latencyMs} onSave={(ms) => st.setSettings({ latencyMs: ms })} />
        </Group>

        <Group title="Apparence"><ThemeChoice /></Group>

        <Badges />

        {st.carnet.length ? (
          <Group title={`Carnet de phrases · ${st.carnet.length}`}>
            {st.carnet.slice(-8).reverse().map((c) => <Text key={c.id} style={type.body}>{c.date} · {c.items.map(degreeLabel).join(' ')}</Text>)}
          </Group>
        ) : null}

        <Group title="Compte"><Account /></Group>
        <Group title="Bêta-test"><Beta /></Group>
      </ScrollView>
    </SafeAreaView>
  );
}

/** une seule vue de progression : les compétences ouvertes, solides, par domaine (et l'équilibre, en détail) */
function Progress() {
  const st = useUserStore();
  const [detail, setDetail] = useState(false);
  const now = Date.now();
  const ps = areaProgress(st.competences, lessonProgressOf(st), now);
  const week = Array.from({ length: 7 }, (_, k) => {
    const key = dayKey(now - (6 - k) * 86_400_000);
    return { key, xp: st.xpByDay[key] ?? 0, label: ['D', 'L', 'M', 'M', 'J', 'V', 'S'][new Date(now - (6 - k) * 86_400_000).getDay()] };
  });
  const maxWeek = Math.max(20, ...week.map((w) => w.xp));
  return (
    <View style={styles.card}>
      <Text style={type.title}>Ta progression</Text>
      {AREAS.map((a) => {
        const p = ps[a];
        return (
          <View key={a} style={{ gap: 4 }}>
            <View style={styles.rowBetween}>
              <Text style={[type.body, { fontWeight: '900', color: AREA_COLOR[a] }]}>{AREA_LABEL[a]}</Text>
              <Text style={type.small}>{p.total ? `${p.solid} solide${p.solid > 1 ? 's' : ''} · ${p.started}/${p.total} commencée${p.total > 1 ? 's' : ''}` : 'Pas encore ouvert'}</Text>
            </View>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${p.total ? (p.started / p.total) * 100 : 0}%`, backgroundColor: `${AREA_COLOR[a]}66` }]} />
              <View style={[styles.barFill, { position: 'absolute', width: `${p.total ? (p.solid / p.total) * 100 : 0}%`, backgroundColor: AREA_COLOR[a] }]} />
            </View>
            {detail ? p.skills.map((sk) => (
              <Text key={sk.id} style={type.small}>{sk.state === 'solide' ? '★' : sk.state === 'commencee' ? '◐' : '○'}  {sk.title}</Text>
            )) : null}
          </View>
        );
      })}
      <Pressable onPress={() => setDetail((x) => !x)} accessibilityRole="button" accessibilityState={{ expanded: detail }} style={styles.more}>
        <Text style={styles.moreText}>{detail ? 'Moins de détails ▴' : 'Détail des compétences ▾'}</Text>
      </Pressable>
      {detail ? (
        <>
          <View style={{ alignItems: 'center' }}>
            <Radar values={{ oreille: ps.oreille.recall, technique: ps.mains.recall, theorie: ps.lecture.recall, rythme: ps.rythme.recall }} />
          </View>
          <Text style={type.small}>★ solide (bien retenue sur plusieurs jours) · ◐ commencée · ○ ouverte, pas encore travaillée</Text>
          <View style={styles.week}>
            {week.map((w) => (
              <View key={w.key} style={styles.dayCol}>
                <View style={[styles.dayBar, { height: 4 + (w.xp / maxWeek) * 50, backgroundColor: w.xp ? colors.accent : colors.line }]} />
                <Text style={type.small}>{w.label}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

function Badges() {
  const st = useUserStore();
  // les badges qu'on ne peut pas encore gagner (boss non accessibles) ne s'affichent que s'ils sont gagnés
  const list = BADGES.filter((b) => !b.id.startsWith('boss') || st.badges.includes(b.id));
  const got = list.filter((b) => st.badges.includes(b.id)).length;
  return (
    <Group title={`Badges · ${got}/${list.length}`}>
      <View style={styles.badges}>
        {list.map((b) => {
          const on = st.badges.includes(b.id);
          return (
            <View key={b.id} style={styles.badge} role="img" accessibilityLabel={`${b.title}${on ? '' : ', à débloquer'} : ${b.description}`}>
              <Text style={[styles.badgeIcon, !on && { opacity: 0.3 }]}>{b.icon}</Text>
              <Text style={[styles.badgeTitle, !on && { color: colors.inkSoft }]}>{b.title}</Text>
              <Text style={styles.badgeLock}>{on ? '' : b.description}</Text>
            </View>
          );
        })}
      </View>
    </Group>
  );
}

function ThemeChoice() {
  const [theme, setTheme] = useState<ThemePref>(themePref);
  return (
    <>
      <Choice label="Thème" value={theme} options={[['auto', 'Auto'], ['clair', 'Clair'], ['sombre', 'Sombre']]} onChange={(v) => {
        setThemePref(v as ThemePref);
        setTheme(v as ThemePref);
        if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.reload();
      }} />
      {theme !== themePref && Platform.OS !== 'web' ? <Text style={type.small}>S'applique au prochain lancement de l'appli.</Text> : null}
    </>
  );
}

function Account() {
  const st = useUserStore();
  const [confirmReset, setConfirmReset] = useState(false);
  const l = syncLabel(useSyncState());
  return (
    <>
      <Text style={type.body}>{l.ok ? '☁️ ' : '⚠️ '}{l.title}</Text>
      <Text style={type.small}>{l.line}</Text>
      <Button small variant="contour" label="Refaire le test de placement" onPress={() => st.setPlacementPending(true)} />
      {confirmReset
        ? <ConfirmBar text="Effacer XP, série, badges et révisions ?" confirmLabel="Tout effacer" danger onConfirm={() => { st.reset(); setConfirmReset(false); }} onCancel={() => setConfirmReset(false)} />
        : <Button variant="texte" color={colors.danger} label="Réinitialiser la progression" onPress={() => setConfirmReset(true)} />}
    </>
  );
}

function Beta() {
  const st = useUserStore();
  const [showNews, setShowNews] = useState(false);
  return (
    <>
      <Text style={type.small}>Un bug, une consigne pas claire, un exercice trop dur ou trop facile ? Le contexte est joint automatiquement. Le bouton 💬 est aussi en haut de chaque exercice.</Text>
      <FeedbackButton where="moi" />
      <View style={styles.rowBetween}>
        <Text style={type.small}>{VERSION_LABEL}</Text>
        <Button small variant="texte" label="Voir les nouveautés" onPress={() => setShowNews(true)} />
      </View>
      {showNews ? <WhatsNew releases={RELEASES.slice(0, 3)} onClose={() => setShowNews(false)} /> : null}
      {SHOW_TEST_TOOLS ? (
        <>
          <Toggle label="Premium" value={st.premium} onChange={st.setPremium} />
          <Toggle label="Tout débloquer" value={st.settings.unlockAll} onChange={(v) => st.setSettings({ unlockAll: v })} />
        </>
      ) : null}
    </>
  );
}

function syncLabel(s: SyncState): { title: string; line: string; ok: boolean } {
  const ago = (t: number) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'à l\'instant' : `il y a ${m} min`; };
  switch (s.kind) {
    case 'saved': return { title: 'Sauvegardée en ligne', line: `Dernier envoi ${ago(s.at)}. Tu retrouves ta progression sur tes autres appareils.`, ok: true };
    case 'restored': return { title: 'Progression récupérée', line: `Une copie plus récente a été récupérée en ligne (${ago(s.at)}).`, ok: true };
    case 'saving': return { title: 'Sauvegarde en cours…', line: 'Envoi de ta progression.', ok: true };
    case 'connecting': return { title: 'Connexion à la sauvegarde…', line: 'Ta progression est déjà enregistrée sur cet appareil.', ok: true };
    case 'error': return { title: 'Sauvegarde en ligne indisponible', line: s.message, ok: false };
    default: return { title: 'Sauvegarde sur cet appareil', line: 'Ta progression est enregistrée sur ce téléphone uniquement.', ok: true };
  }
}

function Group({ title, initiallyOpen = false, children }: { title: string; initiallyOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View style={styles.card}>
      <Pressable onPress={() => setOpen((x) => !x)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={styles.groupHead}>
        <Text style={[type.title, { flex: 1 }]}>{title}</Text>
        <Text style={styles.chev}>{open ? '−' : '+'}</Text>
      </Pressable>
      {open ? children : null}
    </View>
  );
}

function Choice({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <View style={options.length > 3 ? { gap: 6 } : styles.rowBetween}>
      <Text style={type.body}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        {options.map(([v, l]) => (
          <Pressable key={v} onPress={() => onChange(v)} accessibilityRole="radio" accessibilityState={{ checked: value === v }} style={[styles.opt, value === v && styles.optOn]}>
            <Text style={[styles.optText, value === v && { color: colors.onFill }]}>{l}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
  <View style={styles.rowBetween}><Text style={[type.body, { flex: 1 }]}>{label}</Text><Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: colors.accent, false: colors.line }} /></View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  levelBadge: { width: 52, height: 44, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-18deg' }] },
  levelNum: { color: colors.onFill, fontSize: 20, fontWeight: '900', transform: [{ rotate: '18deg' }] },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.line, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.accent },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 16, gap: 10 },
  groupHead: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  chev: { fontSize: 24, fontWeight: '900', color: colors.inkSoft, width: 28, textAlign: 'center' },
  more: { alignSelf: 'center', paddingVertical: 6, minHeight: 36, justifyContent: 'center' },
  moreText: { fontSize: 13, fontWeight: '800', color: colors.inkSoft },
  week: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 74 },
  dayCol: { alignItems: 'center', gap: 4, flex: 1 },
  dayBar: { width: 16, borderRadius: 5 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: { width: '30%', alignItems: 'center', padding: 8, borderRadius: 14, backgroundColor: colors.paper },
  badgeIcon: { fontSize: 28 },
  badgeLock: { fontSize: 10, color: colors.inkSoft, textAlign: 'center' },
  badgeTitle: { fontSize: 12, fontWeight: '700', textAlign: 'center', color: colors.ink },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  opt: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.line },
  optOn: { backgroundColor: colors.primary },
  optText: { fontWeight: '700', color: colors.ink },
});
