import type { ReactNode } from "react";
import { Card, PageTitle } from "@/components/ui";

export const metadata = { title: "Hjelp" };

function Q({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group border-b border-line last:border-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3.5 font-medium">
        {q}
        <span className="text-muted transition group-open:rotate-45" aria-hidden>+</span>
      </summary>
      <div className="space-y-2 pb-4 text-muted [&_strong]:text-white">{children}</div>
    </details>
  );
}

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageTitle sub="Spørsmål og svar om Dartkveld">Hjelp</PageTitle>

      <Card className="py-1 sm:py-1">
        <Q q="Hvordan spilles Mickey Mouse?">
          <p>
            Feltene er <strong>20, 19, 18, 17, 16, 15, Dobbel, Trippel og Bull</strong>, og de kan lukkes i valgfri rekkefølge.
            Hvert treff teller som ett merke, og <strong>tre merker lukker et felt</strong>.
          </p>
          <p>
            Treff på et felt som laget ditt allerede har lukket, teller ikke. Et felt er stengt for alle når alle lagene har
            lukket det. Det er ingen poeng: <strong>laget som først lukker alle feltene, vinner</strong>.
          </p>
          <p>Hver spiller kaster tre piler per runde, og rekkefølgen innen laget roterer automatisk.</p>
        </Q>
        <Q q="Hvordan fører jeg poeng?">
          <p>
            Trykk på feltet pila traff. Bom registrerer du med <strong>Bom</strong>, og <strong>Bom resten</strong> avslutter
            runden når resten av pilene bommet.
          </p>
          <p>
            Tok du feil? <strong>Angre</strong> tar bort siste kast, så mange ganger du vil. Hele kampen lagres kast for kast,
            så du kan lukke appen og fortsette senere.
          </p>
          <p>Bare deltakerne og den som opprettet kampen kan føre poeng. Alle andre kan se på.</p>
        </Q>
        <Q q="Hva betyr kampnummeret?">
          <p>
            Hver kamp har et nummer, for eksempel <strong>#42</strong>. Du ser det i historikken, på kampsiden, i
            visningsmodus og på delingssiden, sammen med hvem som opprettet kampen.
          </p>
        </Q>
        <Q q="Hvordan viser jeg kampen på TV?">
          <p>
            Åpne kampen og trykk <strong>Visningsmodus</strong>. Der er tavla stor og lett å lese på avstand, den viser hvem
            som kaster nå, og skjermen holdes våken. Den oppdateres hvert andre sekund.
          </p>
          <p>
            På iPhone kan du speile skjermen til en Apple TV med <strong>AirPlay</strong>, eller koble telefonen til TV-en med
            HDMI-adapter. På Android bruker du «Cast» eller en USB-C-til-HDMI-kabel.
          </p>
        </Q>
        <Q q="Hvordan deler jeg et resultat?">
          <p>
            Når en kamp er ferdig, dukker det opp en delingsboks på kampsiden. Lenken åpner en side med resultatet og runde-for-runde-oversikt som
            hvem som helst kan se, uten å logge inn. Lenken gir også et fint forhåndsbilde i Messenger og iMessage.
          </p>
          <p>Den som opprettet kampen kan når som helst trekke tilbake delingen.</p>
        </Q>
        <Q q="Hvordan legger jeg appen på hjemskjermen?">
          <p>
            <strong>iPhone (Safari):</strong> trykk på Del-ikonet (firkant med pil opp), velg «Legg til på Hjem-skjerm» og
            trykk «Legg til».
          </p>
          <p>
            <strong>Android (Chrome):</strong> trykk på menyen med de tre prikkene og velg «Installer app» eller «Legg til på
            startskjermen».
          </p>
          <p>Appen åpnes da i fullskjerm, uten adresselinje. Den må fortsatt være på nett for å lagre kast.</p>
        </Q>
        <Q q="Hva betyr tallene i statistikken?">
          <p>
            <strong>Treff per runde</strong> er gjennomsnittlig antall treff som teller (altså som lukker feltene) for hver
            runde på tre piler. <strong>Seiersandel</strong> er andelen ferdige kamper laget ditt har vunnet.
          </p>
          <p>
            <strong>Favorittfelt</strong> er feltet du treffer oftest. <strong>Gjengen</strong> viser tabell, innbyrdes
            oppgjør, «Kveldens beste» og titler for alle som har spilt.
          </p>
        </Q>
        <Q q="Jeg har glemt passordet">
          <p>
            Be en venn med administrator-tilgang om å sette et midlertidig passord til deg. Du kan bytte til et eget
            passord under <strong>Profil</strong> etterpå.
          </p>
        </Q>
      </Card>
    </div>
  );
}
