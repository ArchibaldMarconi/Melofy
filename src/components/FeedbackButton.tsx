// « Donner un retour » : un formulaire DANS l'appli (catégorie, texte, contexte joint automatiquement),
// envoyé par le menu de partage du téléphone (e-mail, WhatsApp, SMS…) : ça marche pour tous les testeurs,
// quels que soient leurs droits sur claude.ai. Sur claude.ai, commenter la page reste possible en option.
import React, { useState } from 'react';
import { Linking, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { currentExercise, sendFeedback, useFeedbackAvailable } from '../feedback';
import { useUserStore } from '../store/useUserStore';
import { colors, type } from '../theme';
import { VERSION_LABEL } from '../version';
import { Button } from './Button';

/** adresse de l'équipe pour les retours (vide : le testeur choisit le destinataire dans le menu de partage) */
export const FEEDBACK_EMAIL = 'archibald230306@gmail.com';

const KINDS: [string, string][] = [['bug', '🐞 Bug'], ['flou', '❓ Pas clair'], ['dur', '😰 Trop dur'], ['facile', '😴 Trop facile'], ['idee', '💡 Idée'], ['autre', 'Autre']];

let seq = 0;

export function FeedbackButton({ where, compact = false }: { where: string; compact?: boolean }) {
  const canComment = useFeedbackAvailable();
  const [id] = useState(() => `melofy-retour-${++seq}`);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState('bug');
  const [text, setText] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const st = useUserStore();
  const build = () => {
    const ex = currentExercise();
    return [
      `Retour bêta ${VERSION_LABEL}`, where,
      ex ? `${ex.id} « ${ex.title} », essai ${ex.attempt} (${ex.phase})` : null,
      st.settings.instrument, `${st.xpTotal} XP`, `${st.sessionsDone} séance${st.sessionsDone > 1 ? 's' : ''}`,
    ].filter(Boolean).join(' · ');
  };
  // le contexte est figé à l'ouverture du formulaire : l'exercice en cours et l'essai
  const [context, setContext] = useState(build);

  const message = () => `${KINDS.find(([k]) => k === kind)?.[1] ?? ''} ${text.trim()}\n\n— ${context}`;
  // par e-mail (adressé directement à l'équipe), ou par le menu de partage (WhatsApp, SMS…)
  const send = async (via: 'email' | 'partage') => {
    const body = message();
    try {
      if (via === 'partage' && (Platform.OS !== 'web' || (typeof navigator !== 'undefined' && 'share' in navigator))) {
        await Share.share({ message: body, title: 'Retour sur Melofy' });
      } else {
        await Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(`Retour sur Melofy : ${KINDS.find(([k]) => k === kind)?.[1] ?? ''}`)}&body=${encodeURIComponent(body)}`);
      }
      setOpen(false); setText(''); setNote('Merci pour ton retour !');
      setTimeout(() => setNote(null), 3000);
    } catch {
      setNote('L\'envoi n\'a pas abouti : réessaie, ou copie ton texte dans un message.');
    }
  };

  return (
    <View style={compact ? styles.compact : styles.box}>
      <Button small variant={compact ? 'texte' : 'contour'} color={colors.accent} label="💬 Donner un retour"
        onPress={() => { setContext(build()); setOpen(true); }} />
      {/* ligne de contexte : visible, et ancre du commentaire sur claude.ai */}
      <Text nativeID={id} style={styles.context} numberOfLines={compact ? 1 : 3}>{context}</Text>
      {note ? <Text style={styles.note}>{note}</Text> : null}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
            <Text style={type.title}>Ton retour</Text>
            <View style={styles.kinds}>
              {KINDS.map(([k, label]) => (
                <Pressable key={k} onPress={() => setKind(k)} accessibilityRole="radio" aria-checked={kind === k} accessibilityState={{ checked: kind === k }}
                  style={[styles.kind, kind === k && styles.kindOn]}>
                  <Text style={[styles.kindText, kind === k && { color: colors.onFill }]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput value={text} onChangeText={setText} multiline placeholder="Qu'est-ce qui s'est passé ? Une phrase suffit."
              placeholderTextColor={colors.inkSoft} style={styles.input} accessibilityLabel="Ton retour" />
            <Text style={styles.context}>Joint automatiquement : {context}</Text>
            <Button color={colors.accent} label="Envoyer par e-mail" disabled={!text.trim()} onPress={() => send('email')} />
            <Button variant="contour" color={colors.accent} label="Autre (WhatsApp, SMS…)" disabled={!text.trim()} onPress={() => send('partage')} />
            {canComment ? (
              <Button variant="texte" color={colors.inkSoft} label="Ou commenter directement la page"
                onPress={async () => { setOpen(false); await new Promise((r) => setTimeout(r, 50)); await sendFeedback(id); }} />
            ) : null}
            <Button variant="texte" color={colors.inkSoft} label="Annuler" onPress={() => setOpen(false)} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 4 },
  compact: { alignItems: 'flex-end', maxWidth: 220 },
  context: { fontSize: 10, color: colors.inkSoft },
  note: { fontSize: 12, color: colors.success },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,17,42,0.55)', justifyContent: 'center', padding: 16 },
  sheet: { backgroundColor: colors.card, borderRadius: 20, padding: 18, gap: 12 },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  kind: { borderWidth: 2, borderColor: colors.accent, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, minHeight: 40, justifyContent: 'center' },
  kindOn: { backgroundColor: colors.accent },
  kindText: { color: colors.accent, fontWeight: '800', fontSize: 13 },
  input: { minHeight: 100, borderWidth: 2, borderColor: colors.line, borderRadius: 14, padding: 12, color: colors.ink, fontSize: 16, textAlignVertical: 'top' },
});
