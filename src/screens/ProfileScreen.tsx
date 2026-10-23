// Page 3 — Profil : niveau, XP, série, radar des domaines, badges, carnet, réglages.
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Domain, InputMode, Instrument } from '../content/types';
import { BADGES } from '../content/badges';
import { TEMPLATES } from '../content/templates';
import { CONCEPTS } from '../content/concepts';
import { currentR } from '../engine/fsrs';
import { degreeLabel } from '../engine/music';
import { levelFromXp } from '../engine/xp';
import { dayKey, useUserStore } from '../store/useUserStore';
import { Radar } from '../components/Radar';
import { Button } from '../components/Button';
import { ConfirmBar } from '../components/ConfirmBar';
import { LatencyCalibration } from '../components/LatencyCalibration';
import { MicTest } from '../components/MicTest';
import { LESSON_POINTS } from '../content/lessons';
import { TUNINGS } from '../tuning';
import { WhatsNew } from '../components/WhatsNew';
import { RELEASES, VERSION_LABEL } from '../version';
import { FeedbackButton } from '../components/FeedbackButton';
import { useSyncState, type SyncState } from '../syncStatus';
import { audio } from '../audio/RNAudioEngine';
import { droneFor } from '../engine/music';
import { SHOW_TEST_TOOLS } from '../config';
import { colors, domainColor, setThemePref, themePref, type, type ThemePref } from '../theme';
import { Platform } from 'react-native';

export function ProfileScreen() {
  const st = useUserStore();
  const [confirmReset, setConfirmReset] = useState(false);
  const [showNews, setShowNews] = useState(false);
  const [theme, setTheme] = useState<ThemePref>(themePref);
  const lv = levelFromXp(st.xpTotal);
  const now = Date.now();

  const radar: Partial<Record<Domain, number>> = {};
  // le radar mesure ce que l'utilisateur a atteint (jusqu'à son palier actuel), pas tout le contenu de l'appli
  const reached = Math.max(1, ...Object.values(st.competences).map((c) => CONCEPTS.find((x) => x.id === c.conceptId)?.palier ?? 1));
  (['rythme', 'oreille', 'theorie', 'technique'] as Domain[]).forEach((d) => {
    const ids = [...new Set(TEMPLATES.filter((t) => t.domain === d && t.palier <= reached).flatMap((t) => t.concepts))];
    radar[d] = ids.reduce((s, id) => s + currentR(st.competences[`${id}:${d}`], now), 0) / Math.max(ids.length, 1);
  });

  const week = Array.from({ length: 7 }, (_, k) => {
    const key = dayKey(now - (6 - k) * 86_400_000);
    return { key, xp: st.xpByDay[key] ?? 0, label: ['D', 'L', 'M', 'M', 'J', 'V', 'S'][new Date(now - (6 - k) * 86_400_000).getDay()] };
  });
  const maxWeek = Math.max(20, ...week.map((w) => w.xp));

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.levelRow}>
          <View style={styles.levelBadge}><Text style={styles.levelNum}>{lv.level}</Text></View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={type.title}>Niveau {lv.level}</Text>
            <View style={styles.bar}><View style={[styles.barFill, { width: `${((st.xpTotal - lv.current) / (lv.next - lv.current)) * 100}%` }]} /></View>
            <Text style={type.small}>{st.xpTotal} XP · encore {lv.next - st.xpTotal} pour le niveau {lv.level + 1}</Text>
          </View>
        </View>

        <View style={styles.stats}>
          <Stat value={`🔥 ${st.streak}`} label="série" />
          <Stat value={`${st.bestStreak}`} label="record" />
          <Stat value={`❄️ ${st.freezes}`} label="gels" />
          <Stat value={`${st.sessionsDone}`} label="séances" />
        </View>

        <SyncCard />

        <DomainProgress />

        <View style={styles.card}>
          <Text style={type.title}>Bêta-test</Text>
          <Text style={type.small}>Un bug, une consigne pas claire, un exercice trop dur ou trop facile ? Dis-le : le contexte (écran, exercice, essai) est joint automatiquement. Le bouton est aussi en haut de chaque exercice.</Text>
          <FeedbackButton where="profil" />
          <View style={styles.rowBetween}>
            <Text style={type.small}>{VERSION_LABEL}</Text>
            <Button small variant="texte" label="Voir les nouveautés" onPress={() => setShowNews(true)} />
          </View>
        </View>
        {showNews ? <WhatsNew releases={RELEASES.slice(0, 3)} onClose={() => setShowNews(false)} /> : null}

        <View style={styles.card}>
          <Text style={type.title}>Cette semaine</Text>
          <View style={styles.week}>
            {week.map((w) => (
              <View key={w.key} style={styles.dayCol}>
                <View style={[styles.dayBar, { height: 6 + (w.xp / maxWeek) * 80, backgroundColor: w.xp ? colors.accent : colors.line }]} />
                <Text style={type.small}>{w.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.card, { alignItems: 'center' }]}>
          <Text style={[type.title, { alignSelf: 'flex-start' }]}>Équilibre des domaines</Text>
          <Radar values={radar} />
        </View>

        <View style={styles.card}>
          <Text style={type.title}>Badges</Text>
          <View style={styles.badges}>
            {BADGES.map((b) => {
              const on = st.badges.includes(b.id);
              return (
                <View key={b.id} style={styles.badge} role="img" accessibilityLabel={`${b.title}${on ? '' : ', à débloquer'} : ${b.description}`}>
                  <Text style={[styles.badgeIcon, !on && { opacity: 0.3 }]}>{b.icon}</Text>
                  <Text style={[styles.badgeTitle, !on && { color: colors.inkSoft }]}>{b.title}</Text>
                  {!on ? <Text style={styles.badgeLock}>à débloquer</Text> : null}
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={type.title}>Carnet de phrases</Text>
          {st.carnet.length === 0 ? <Text style={type.body}>Tes repiquages et réponses réussis s'ajoutent ici.</Text> : null}
          {st.carnet.slice(-6).reverse().map((c) => (
            <Text key={c.id} style={type.body}>{c.date} · {c.items.map(degreeLabel).join(' ')}</Text>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={type.title}>Réglages</Text>
          <Choice label="Instrument" value={st.settings.instrument} options={[['piano', 'Piano'], ['guitare', 'Guitare']]} onChange={(v) => st.setSettings({ instrument: v as Instrument, inputPref: v === 'guitare' ? 'manche' : 'clavier' })} />
          <Choice label="Saisie préférée" value={st.settings.inputPref} options={[[st.settings.instrument === 'guitare' ? 'manche' : 'clavier', 'Écran'], ['micro', 'Micro']]} onChange={(v) => st.setSettings({ inputPref: v as InputMode })} />
          <Choice label="Apparence" value={theme} options={[['auto', 'Auto'], ['clair', 'Clair'], ['sombre', 'Sombre']]} onChange={(v) => {
            setThemePref(v as ThemePref);
            setTheme(v as ThemePref);
            if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.reload();
          }} />
          {theme !== themePref && Platform.OS !== 'web' ? <Text style={type.small}>S'applique au prochain lancement de l'appli.</Text> : null}
          <Toggle label="Portée en direct (les notes jouées s'écrivent)" value={st.settings.liveStaff !== false} onChange={(v) => st.setSettings({ liveStaff: v })} />
          {st.settings.instrument === 'guitare' ? (
            <>
              <Toggle label="Mode gaucher (manche inversé)" value={!!st.settings.lefty} onChange={(v) => st.setSettings({ lefty: v })} />
              <Choice label="Accordage" value={st.settings.tuning ?? 'standard'} options={Object.entries(TUNINGS).map(([k, t]) => [k, t.label.split(' (')[0]] as [string, string])} onChange={(v) => st.setSettings({ tuning: v })} />
            </>
          ) : null}
          <Choice label="Notation des accords" value={st.settings.chordNotation ?? 'maj7'} options={[['maj7', 'maj7, m7'], ['delta', 'Δ7, –7']]} onChange={(v) => st.setSettings({ chordNotation: v as 'maj7' | 'delta' })} />
          {st.settings.instrument === 'guitare' ? (
            <Choice label="Lecture à la guitare" value={st.settings.guitarReading ?? 'portee'} options={[['portee', 'Portée'], ['tab', 'Tablature']]} onChange={(v) => st.setSettings({ guitarReading: v as 'portee' | 'tab' })} />
          ) : null}
          <Toggle label="Noms de notes au lieu des degrés" value={st.settings.showNoteNames} onChange={(v) => st.setSettings({ showNoteNames: v })} />
          <Choice label="Bourdon" value={String(st.settings.droneVolume ?? 0.6)} options={[['0.35', 'Doux'], ['0.6', 'Moyen'], ['0.9', 'Fort']]} onChange={(v) => {
            st.setSettings({ droneVolume: Number(v) });
            audio.droneVolume = Number(v);
            audio.init().then(() => { audio.startDrone(droneFor(st.settings.instrument === 'guitare' ? 45 : 60)); setTimeout(() => audio.stopDrone(), 1500); });
          }} />
          <MicTest gate={st.settings.micGate} onSave={(g) => st.setSettings({ micGate: g })} />
          <LatencyCalibration current={st.settings.latencyMs} onSave={(ms) => st.setSettings({ latencyMs: ms })} />
          <Button small variant="contour" label="Refaire le test de placement" onPress={() => st.setPlacementPending(true)} />
          {SHOW_TEST_TOOLS ? (
            <>
              <Text style={[type.title, { fontSize: 15, marginTop: 8 }]}>Test (bêta seulement)</Text>
              <Toggle label="Premium" value={st.premium} onChange={st.setPremium} />
              <Toggle label="Tout débloquer" value={st.settings.unlockAll} onChange={(v) => st.setSettings({ unlockAll: v })} />
            </>
          ) : null}
          {confirmReset
            ? <ConfirmBar text="Effacer XP, série, badges et révisions ?" confirmLabel="Tout effacer" danger onConfirm={() => { st.reset(); setConfirmReset(false); }} onCancel={() => setConfirmReset(false)} />
            : <Button variant="texte" color={colors.danger} label="Réinitialiser la progression" onPress={() => setConfirmReset(true)} />}
        </View>
      </ScrollView>
    </SafeAreaView>
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

function DomainProgress() {
  const st = useUserStore();
  const order = [...CONCEPTS];
  const doms = [['rythme', 'Rythme'], ['oreille', 'Oreille'], ['theorie', 'Théorie et lecture'], ['technique', 'Technique']] as const;
  const totalPoints = Object.keys(LESSON_POINTS).length;
  return (
    <View style={styles.card}>
      <Text style={type.title}>Où tu en es</Text>
      {doms.map(([d, label]) => {
        const acquired = order.filter((c) => Object.values(st.competences).some((x) => x.conceptId === c.id && x.domain === d && x.reps > 0 && (x.successes ?? 0) > 0));
        const last = acquired[acquired.length - 1];
        const next = order.find((c) => !acquired.includes(c) && TEMPLATES.some((t) => t.domain === d && t.concepts[0] === c.id && !t.optionnel));
        return (
          <View key={d} style={{ gap: 2 }}>
            <Text style={[type.body, { fontWeight: '900', color: domainColor[d] }]}>{label} · palier {last?.palier ?? 1}</Text>
            <Text style={type.small}>{last ? `Acquis : ${last.title}` : 'Pas encore commencé'}{next ? ` · ensuite : ${next.title}` : ''}</Text>
          </View>
        );
      })}
      <Text style={type.small}>Points de leçon validés : {(st.validatedPoints ?? []).length} / {totalPoints}</Text>
    </View>
  );
}

function SyncCard() {
  const s = useSyncState();
  const l = syncLabel(s);
  return (
    <View style={styles.card} accessibilityLiveRegion="polite">
      <Text style={type.title}>{l.ok ? '☁️ ' : '⚠️ '}{l.title}</Text>
      <Text style={type.small}>{l.line}</Text>
    </View>
  );
}

const Stat = ({ value, label }: { value: string; label: string }) => (
  <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={type.small}>{label}</Text></View>
);

function Choice({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <View style={options.length > 3 ? { gap: 6 } : styles.rowBetween}>
      <Text style={type.body}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        {options.map(([v, l]) => (
          <Pressable key={v} onPress={() => onChange(v)} style={[styles.opt, value === v && styles.optOn]}>
            <Text style={[styles.optText, value === v && { color: colors.onFill }]}>{l}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
  <View style={styles.rowBetween}><Text style={type.body}>{label}</Text><Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: colors.accent, false: colors.line }} /></View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  levelBadge: { width: 78, height: 64, borderRadius: 40, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-18deg' }] },
  levelNum: { color: colors.onFill, fontSize: 30, fontWeight: '900', transform: [{ rotate: '18deg' }] },
  bar: { height: 10, borderRadius: 5, backgroundColor: colors.line, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.accent },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: 16, paddingVertical: 12, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '900', color: colors.ink },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 16, gap: 10 },
  week: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 110 },
  dayCol: { alignItems: 'center', gap: 4, flex: 1 },
  dayBar: { width: 18, borderRadius: 6 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: { width: '30%', alignItems: 'center', padding: 8, borderRadius: 14, backgroundColor: colors.paper },
  badgeIcon: { fontSize: 28 },
  badgeLock: { fontSize: 10, color: colors.inkSoft },
  badgeTitle: { fontSize: 12, fontWeight: '700', textAlign: 'center', color: colors.ink },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  opt: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.line },
  optOn: { backgroundColor: colors.primary },
  optText: { fontWeight: '700', color: colors.ink },
});
