import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BUSINESS } from "@/config/business";
import { formatPhone } from "@/lib/format";

/*
  TEMPLATE written for Québec's Law 25 (Loi 25). It is not legal advice: have it
  reviewed, fill in the TODO values in config/business.ts, and bump
  BUSINESS.privacyPolicyVersion whenever this text changes.
*/

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("privacyTitle") };
}

const officer = BUSINESS.privacyOfficer;
const phone = formatPhone(BUSINESS.phone);
const months = BUSINESS.photoRetentionMonths;

function Fr() {
  return (
    <>
      <h1>Politique de confidentialité</h1>
      <p className="lead">En vigueur le {BUSINESS.privacyPolicyVersion}.</p>

      <h2>Responsable de la protection des renseignements personnels</h2>
      <p>
        {officer.name}, {officer.title}, {BUSINESS.name}. Courriel : <a href={`mailto:${officer.email}`}>{officer.email}</a>.
        Téléphone : {phone}.
      </p>

      <h2>Ce que nous recueillons</h2>
      <ul>
        <li>Vos prénom, nom, numéro de téléphone et adresse courriel.</li>
        <li>L&apos;adresse de la maison à nettoyer.</li>
        <li>Les 4 photos de l&apos;extérieur de votre maison que vous prenez dans le formulaire.</li>
        <li>Votre adresse IP, utilisée seulement pour limiter les abus du formulaire.</li>
      </ul>

      <h2>Pourquoi</h2>
      <p>
        Pour calculer et vous envoyer votre prix, vous joindre au sujet de votre soumission et planifier les travaux si
        vous l&apos;acceptez. Nous ne vendons pas vos renseignements et ne les utilisons pas à d&apos;autres fins sans
        votre consentement.
      </p>

      <h2>Prix calculé automatiquement</h2>
      <p>
        Vos photos sont analysées par un système d&apos;intelligence artificielle qui compte les carreaux de vitre, les
        étages et les murs. Votre prix est ensuite calculé automatiquement à partir de ces chiffres et de nos tarifs. Les
        chiffres utilisés sont affichés avec votre prix. Vous pouvez demander qu&apos;un membre de notre équipe révise
        votre prix ou corrige ces chiffres en nous appelant au {phone}. Quand l&apos;analyse est incertaine, une personne
        vérifie toujours le prix avant de vous le confirmer.
      </p>

      <h2>Qui y a accès</h2>
      <p>
        Notre équipe, et les fournisseurs qui nous aident à offrir ce service, seulement pour ce besoin. Certains sont
        situés à l&apos;extérieur du Québec :
      </p>
      <ul>
        <li>Vercel (hébergement du site et des photos), États-Unis;</li>
        <li>Anthropic (analyse des photos par intelligence artificielle), États-Unis;</li>
        <li>Make (transmission de votre demande à nos outils de gestion);</li>
        <li>Google (suggestions d&apos;adresse pendant que vous tapez);</li>
        <li>Upstash (limitation des abus, adresse IP seulement).</li>
      </ul>
      <p>
        Avant de communiquer des renseignements à l&apos;extérieur du Québec, nous évaluons si ces fournisseurs les
        protègent adéquatement.
      </p>

      <h2>Combien de temps nous les gardons</h2>
      <p>
        Vos photos et vos renseignements sont conservés au plus {months} mois après votre dernière demande ou visite,
        puis détruits. Avant l&apos;envoi du formulaire, vos photos restent seulement sur votre appareil.
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous pouvez demander d&apos;accéder à vos renseignements, de les faire corriger ou supprimer, ou retirer votre
        consentement, en écrivant à <a href={`mailto:${officer.email}`}>{officer.email}</a>. Nous répondons dans les 30
        jours. Si vous n&apos;êtes pas satisfait de notre réponse, vous pouvez porter plainte à la Commission d&apos;accès
        à l&apos;information du Québec.
      </p>

      <h2>Témoins (cookies)</h2>
      <p>
        Ce site n&apos;utilise pas de témoins publicitaires. Pendant que vous remplissez le formulaire, vos réponses et
        vos photos sont gardées dans votre navigateur pour ne pas les perdre si la page se recharge.
      </p>
    </>
  );
}

function En() {
  return (
    <>
      <h1>Privacy policy</h1>
      <p className="lead">In effect as of {BUSINESS.privacyPolicyVersion}.</p>

      <h2>Person in charge of protecting personal information</h2>
      <p>
        {officer.name}, {officer.title}, {BUSINESS.name}. Email: <a href={`mailto:${officer.email}`}>{officer.email}</a>.
        Phone: {phone}.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>Your first name, last name, phone number and email address.</li>
        <li>The address of the house to be cleaned.</li>
        <li>The 4 photos of the outside of your house that you take in the form.</li>
        <li>Your IP address, used only to limit abuse of the form.</li>
      </ul>

      <h2>Why</h2>
      <p>
        To calculate and send you your price, contact you about your quote, and schedule the work if you accept it. We do
        not sell your information or use it for anything else without your consent.
      </p>

      <h2>Automatically calculated price</h2>
      <p>
        Your photos are analyzed by an artificial intelligence system that counts window panes, storeys and walls. Your
        price is then calculated automatically from those numbers and our rates. The numbers used are shown with your
        price. You can ask a member of our team to review your price or correct those numbers by calling us at {phone}.
        When the analysis is uncertain, a person always checks the price before confirming it to you.
      </p>

      <h2>Who has access</h2>
      <p>Our team, and the providers that help us offer this service, only for that purpose. Some are outside Québec:</p>
      <ul>
        <li>Vercel (website and photo hosting), United States;</li>
        <li>Anthropic (artificial intelligence photo analysis), United States;</li>
        <li>Make (sending your request to our management tools);</li>
        <li>Google (address suggestions while you type);</li>
        <li>Upstash (abuse limiting, IP address only).</li>
      </ul>
      <p>Before sending information outside Québec, we assess whether these providers protect it adequately.</p>

      <h2>How long we keep it</h2>
      <p>
        Your photos and information are kept for at most {months} months after your last request or visit, then
        destroyed. Before you submit the form, your photos stay only on your device.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask to access your information, have it corrected or deleted, or withdraw your consent by writing to{" "}
        <a href={`mailto:${officer.email}`}>{officer.email}</a>. We answer within 30 days. If you are not satisfied with
        our answer, you can file a complaint with the Commission d&apos;accès à l&apos;information du Québec.
      </p>

      <h2>Cookies</h2>
      <p>
        This site does not use advertising cookies. While you fill in the form, your answers and photos are kept in your
        browser so they are not lost if the page reloads.
      </p>
    </>
  );
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <article className="prose-zf mx-auto max-w-2xl px-4 py-10">{locale === "fr" ? <Fr /> : <En />}</article>
  );
}
