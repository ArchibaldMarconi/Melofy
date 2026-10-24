// Fiche d'un exercice depuis l'arbre : état de maîtrise, paramètres réglables, lancement.
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import type { ExerciseTemplate, ParamSpec, Params, ParamValue } from '../content/types';
import { MECHANIC_LABEL } from '../content/templates';
import { currentR, medal } from '../engine/fsrs';
import { cardOf } from '../engine/srs';
import { useUserStore } from '../store/useUserStore';
import { colors, domainColor, domainLabel, type } from '../theme';
import { Button } from './Button';
import { CONSIGNES } from '../content/consignes';
import { LESSON_POINTS, type LessonPoint } from '../content/lessons';
import { LessonPointCard } from './LessonPointCard';

interface Props { template: ExerciseTemplate | null; locked?: string; onClose: () => void; onLaunch: (params: Params) => void }

const MEDAL_LABEL = { aucune: 'Jamais pratiqué', debut: 'En cours', bronze: 'Bronze', argent: 'Argent', or: 'Or' };

export function ExerciseSheet({ template: t, locked, onClose, onLaunch }: Props) {
  const [params, setParams] = useState<Params>({});
  const [point, setPoint] = useState<LessonPoint | null>(null);
  const instrument = useUserStore((s) => s.settings.instrument);
  const premium = useUserStore((s) => s.canPractice());
  const comps = useUserStore((s) => s.competences);
  if (!t) return null;
  const color = domainColor[t.domain];
  const comp = cardOf(t, comps);
  const value = (k: string) => params[k] ?? t.params[k];
  const set = (k: string, v: ParamValue) => setParams((p) => ({ ...p, [k]: v }));

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fermer" />
      <View style={styles.sheet}>
        {point ? (
          <ScrollView contentContainerStyle={{ gap: 12 }}>
            <LessonPointCard point={point} color={color} instrument={instrument} doneLabel="Retour à la fiche" onDone={() => setPoint(null)} />
          </ScrollView>
        ) : (
        <ScrollView contentContainerStyle={{ gap: 12 }}>
          <Text style={[styles.meta, { color }]}>{t.id} · {domainLabel[t.domain]} · {MECHANIC_LABEL[t.mechanic]} · palier {t.palier}, niveau {t.niveau}</Text>
          <Text style={type.title}>{t.title}</Text>
          <Text style={type.body}>{CONSIGNES[t.id]?.faire ?? t.description}</Text>
          {(CONSIGNES[t.id]?.lecons ?? []).length ? (
            <View style={{ gap: 6 }}>
              <Text style={type.small}>Points de leçon</Text>
              <View style={styles.chips}>
                {CONSIGNES[t.id].lecons.map((id) => LESSON_POINTS[id]).filter(Boolean).map((pt) => (
                  <Button key={pt.id} small variant="contour" color={color} label={`📖 ${pt.title}`} onPress={() => setPoint(pt)} />
                ))}
              </View>
            </View>
          ) : null}
          <Text style={type.small}>
            {MEDAL_LABEL[medal(comp)]}{comp?.reps ? ` · rappel ${Math.round(currentR(comp, Date.now()) * 100)} % · prochaine révision ${new Date(comp.due).toLocaleDateString('fr-FR')}` : ''}
          </Text>
          {t.paramSpecs.length ? <Text style={[type.title, { fontSize: 16 }]}>Paramètres</Text> : null}
          {t.paramSpecs.map((ps) => <ParamEditor key={ps.key} spec={ps} value={value(ps.key)} onChange={(v) => set(ps.key, v)} color={color} />)}
          {locked ? <Text style={[type.body, { color: colors.danger }]}>{locked}</Text> : null}
          {!premium ? <Text style={type.small}>La pratique libre fait partie du premium. Ta séance du jour t'attend dans Workout.</Text> : null}
          <Button color={color} label="Lancer l'exercice" disabled={!!locked || !premium} onPress={() => onLaunch(params)} />
        </ScrollView>
        )}
      </View>
    </Modal>
  );
}

function ParamEditor({ spec, value, onChange, color }: { spec: ParamSpec; value: ParamValue | undefined; onChange: (v: ParamValue) => void; color: string }) {
  if (spec.kind === 'toggle') {
    return (
      <View style={styles.row}>
        <Text style={type.body}>{spec.label}</Text>
        <Switch accessibilityLabel={spec.label} value={!!value} onValueChange={onChange} trackColor={{ true: color, false: colors.line }} />
      </View>
    );
  }
  if (spec.kind === 'enum') {
    return (
      <View style={{ gap: 6 }}>
        <Text style={type.small}>{spec.label}</Text>
        <View style={styles.chips}>
          {spec.options!.map((o) => {
            const on = JSON.stringify(o.value) === JSON.stringify(value ?? spec.options![0].value);
            return (
              <Pressable key={o.label} onPress={() => onChange(o.value)} style={[styles.chip, on && { backgroundColor: color, borderColor: color }]}>
                <Text style={[styles.chipText, on && { color: colors.onFill }]}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }
  const cur = Array.isArray(value) ? Number(value[0]) : typeof value === 'number' ? value : spec.min ?? 0;
  const step = spec.step ?? 1;
  return (
    <View style={styles.row}>
      <Text style={type.body}>{spec.label}</Text>
      <View style={styles.stepper}>
        <Button small variant="contour" color={color} label="−" onPress={() => onChange(Math.max(spec.min ?? 0, cur - step))} />
        <Text style={styles.value}>{cur}</Text>
        <Button small variant="contour" color={color} label="+" onPress={() => onChange(Math.min(spec.max ?? 999, cur + step))} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(33,26,69,0.35)' },
  sheet: { maxHeight: '80%', backgroundColor: colors.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22 },
  meta: { fontWeight: '800', fontSize: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 2, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontWeight: '700', color: colors.ink },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  value: { minWidth: 36, textAlign: 'center', fontSize: 18, fontWeight: '800', color: colors.ink },
});
