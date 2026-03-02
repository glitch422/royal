# 06 - Convertir des CROWN en USDT (Withdraw)

Date d’entrée en vigueur: 2026-02-21

- Withdraw visible seulement si withdrawalsActive=true et solde ≥ 500 USDT équivalent (50 CROWN)
- Minimum: 50 CROWN (sinon afficher "Minimum withdrawal is 50 CROWN")
- Réseaux: TRC20, ERC20
- Étapes: Wallet → Withdraw → montant → réseau → adresse → envoyer
- Statuts: pending, approved, rejected, sent (TXID)

Support: [Support Email]


Réseaux USDT pris en charge sur ROYAL:
- TRC20 (Tron)
- ERC20 (Ethereum)

Important: le réseau doit correspondre exactement côté envoi et réception.

Confirmations:
- Le crédit est appliqué lorsque NOWPayments détecte suffisamment de confirmations et envoie une mise à jour de statut (par ex: waiting → confirming → confirmed/finished).
- Le délai dépend du réseau et de la congestion.
