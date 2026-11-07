"use client";
import { useState, useTransition } from "react";
import { GAMES, SELECTABLE_GAME_TYPES, type GameType } from "@/games";
import { teamColor } from "@/lib/colors";
import { Button, Card, ErrorText, inputClass } from "@/components/ui";
import { createMatchAction } from "./actions";

type User = { id: string; name: string };
type Player = { key: string; kind: "user"; userId: string; name: string } | { key: string; kind: "guest"; name: string };
type Team = { key: string; name: string; nameEdited: boolean; players: Player[] };

let counter = 0;
const key = () => `k${++counter}`;

function autoName(team: Team, index: number) {
  if (team.nameEdited) return team.name;
  return team.players.length ? team.players.map((p) => p.name).join(" & ") : `Lag ${index + 1}`;
}

export function NewMatchForm({ users, me }: { users: User[]; me: User }) {
  const [gameType, setGameType] = useState<GameType>("mickey-mouse");
  const [teams, setTeams] = useState<Team[]>(() => [
    { key: key(), name: me.name, nameEdited: false, players: [{ key: key(), kind: "user", userId: me.id, name: me.name }] },
    { key: key(), name: "Lag 2", nameEdited: false, players: [] },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const game = GAMES[gameType];

  const chosen = new Set(teams.flatMap((t) => t.players.flatMap((p) => (p.kind === "user" ? [p.userId] : []))));

  function update(index: number, fn: (t: Team) => Team) {
    setTeams((ts) => ts.map((t, i) => (i === index ? { ...fn(t) } : t)).map((t, i) => ({ ...t, name: autoName(t, i) })));
  }

  function submit() {
    setError(null);
    const payload = {
      gameType,
      teams: teams.map((t) => ({
        name: t.name.trim(),
        players: t.players.map((p) => (p.kind === "user" ? { kind: "user", userId: p.userId } : { kind: "guest", name: p.name })),
      })),
    };
    startTransition(async () => {
      const res = await createMatchAction(payload);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-5">
      <Card>
        <h2 className="mb-3 font-semibold">Spill</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {SELECTABLE_GAME_TYPES.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGameType(g)}
              className={`touch-pad rounded-xl border p-4 text-left ${g === gameType ? "border-accent bg-accent/10" : "border-line bg-bg"}`}
            >
              <div className="font-semibold">{GAMES[g].name}</div>
              <div className="mt-1 text-sm text-muted">{GAMES[g].description}</div>
            </button>
          ))}
          <div className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">501, 301 og Around the Clock kommer senere.</div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {teams.map((team, ti) => (
          <TeamEditor
            key={team.key}
            team={team}
            index={ti}
            users={users.filter((u) => !chosen.has(u.id))}
            canRemove={teams.length > game.minTeams}
            onChange={(fn) => update(ti, fn)}
            onRemove={() => setTeams((ts) => ts.filter((_, i) => i !== ti).map((t, i) => ({ ...t, name: autoName(t, i) })))}
          />
        ))}
      </div>

      {teams.length < game.maxTeams && (
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => setTeams((ts) => [...ts, { key: key(), name: `Lag ${ts.length + 1}`, nameEdited: false, players: [] }])}
        >
          + Legg til lag
        </Button>
      )}

      <ErrorText>{error}</ErrorText>
      <Button size="lg" className="w-full" onClick={submit} disabled={pending || teams.some((t) => t.players.length === 0 || !t.name.trim())}>
        {pending ? "Starter ..." : "Start kamp"}
      </Button>
    </div>
  );
}

function TeamEditor({
  team,
  index,
  users,
  canRemove,
  onChange,
  onRemove,
}: {
  team: Team;
  index: number;
  users: User[];
  canRemove: boolean;
  onChange: (fn: (t: Team) => Team) => void;
  onRemove: () => void;
}) {
  const [guest, setGuest] = useState("");
  const addPlayer = (p: Player) => onChange((t) => ({ ...t, players: [...t.players, p] }));

  return (
    <Card className="space-y-3" >
      <div className="flex items-center gap-2">
        <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: teamColor(index) }} />
        <input
          aria-label="Lagnavn"
          value={team.name}
          maxLength={40}
          onChange={(e) => onChange((t) => ({ ...t, name: e.target.value, nameEdited: true }))}
          className={`${inputClass} h-11 font-semibold`}
        />
        {canRemove && (
          <Button variant="ghost" size="sm" onClick={onRemove} aria-label="Fjern lag">
            Fjern
          </Button>
        )}
      </div>

      {team.players.length > 0 ? (
        <ol className="space-y-1.5">
          {team.players.map((p, pi) => (
            <li key={p.key} className="flex items-center gap-2 rounded-lg bg-bg px-3 py-2">
              <span className="w-5 text-sm text-muted">{pi + 1}.</span>
              <span className="flex-1 truncate">{p.name}</span>
              {p.kind === "guest" && <span className="text-xs text-muted">gjest</span>}
              {pi > 0 && (
                <button
                  type="button"
                  className="touch-pad px-2 text-muted hover:text-white"
                  aria-label="Flytt opp"
                  onClick={() =>
                    onChange((t) => {
                      const players = [...t.players];
                      [players[pi - 1], players[pi]] = [players[pi], players[pi - 1]];
                      return { ...t, players };
                    })
                  }
                >
                  ↑
                </button>
              )}
              <button
                type="button"
                className="touch-pad px-2 text-muted hover:text-danger"
                aria-label={`Fjern ${p.name}`}
                onClick={() => onChange((t) => ({ ...t, players: t.players.filter((x) => x.key !== p.key) }))}
              >
                ✕
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted">Ingen spillere ennå.</p>
      )}
      {team.players.length > 1 && <p className="text-xs text-muted">Spillerne kaster etter tur i denne rekkefølgen.</p>}

      <select
        aria-label="Legg til registrert spiller"
        className={inputClass}
        value=""
        onChange={(e) => {
          const u = users.find((x) => x.id === e.target.value);
          if (u) addPlayer({ key: key(), kind: "user", userId: u.id, name: u.name });
        }}
      >
        <option value="">+ Legg til spiller ...</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const name = guest.trim();
          if (!name) return;
          addPlayer({ key: key(), kind: "guest", name });
          setGuest("");
        }}
      >
        <input value={guest} maxLength={40} onChange={(e) => setGuest(e.target.value)} placeholder="Gjest (bare navn)" className={inputClass} />
        <Button type="submit" variant="secondary" className="h-12 shrink-0" disabled={!guest.trim()}>
          Legg til
        </Button>
      </form>
    </Card>
  );
}
