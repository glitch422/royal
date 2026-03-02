/**
 * ROYAL - Shared Enums & Constants (Frontend Mock)
 * -------------------------------------------------
 * Single source of truth for role keys, networks, statuses and business rules.
 * Designed for file:// usage (no bundler).
 */

const Roles = Object.freeze({
  GUEST: 'guest',
  PLAYER: 'player',
  ADMIN: 'admin',
  ROOT: 'root',
});

const Languages = Object.freeze({
  HE: 'he',
  AR: 'ar',
  EN: 'en',
  FR: 'fr',
  RU: 'ru',
});

const Currency = Object.freeze({
  CROWN: 'CROWN',
  USDT: 'USDT',
  USD: 'USD',
});

const USDTNetworks = Object.freeze({
  TRC20: 'TRC20',
  ERC20: 'ERC20',
});

const UserStatus = Object.freeze({
  ACTIVE: 'active',
  FROZEN: 'frozen',
  BANNED: 'banned',
});

const WithdrawalStatus = Object.freeze({
  REQUESTED: 'requested',
  REJECTED: 'rejected',
  PAID: 'paid',
});

const DepositStatus = Object.freeze({
  WAITING: 'waiting',
  CONFIRMING: 'confirming',
  CONFIRMED: 'confirmed',
  FINISHED: 'finished',
  FAILED: 'failed',
  EXPIRED: 'expired',
});

const PokerPhase = Object.freeze({
  PREFLOP: 'preflop',
  FLOP: 'flop',
  TURN: 'turn',
  RIVER: 'river',
  SHOWDOWN: 'showdown',
  FINISHED: 'finished',
});

const BusinessRules = Object.freeze({
  // Visibility and request thresholds are intentionally separated.
  WITHDRAW_BUTTON_MIN_CROWN: 50,
  WITHDRAW_REQUEST_MIN_CROWN: 50,

  // Default value model
  // 1 CROWN equals 1 USD (and for checkout: 1 USDT = 1 USD).
  DEFAULT_CROWN_USD_RATE: 1,

  // Fee caps
  MAX_TOTAL_WITHDRAW_FEE_PCT: 5,

  SUPPORTED_LANGUAGES: ['he','ar','en','fr','ru'],
  SUPPORTED_USDT_NETWORKS: [USDTNetworks.TRC20, USDTNetworks.ERC20],
});

const Enums = Object.freeze({
  Roles,
  Languages,
  Currency,
  USDTNetworks,
  UserStatus,
  WithdrawalStatus,
  DepositStatus,
  PokerPhase,
  BusinessRules,
});

// Bind to window
window.Enums = Enums;
window.Roles = Roles;
window.Languages = Languages;
window.Currency = Currency;
window.USDTNetworks = USDTNetworks;
window.UserStatus = UserStatus;
window.WithdrawalStatus = WithdrawalStatus;
window.DepositStatus = DepositStatus;
window.PokerPhase = PokerPhase;
window.BusinessRules = BusinessRules;
