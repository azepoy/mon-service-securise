class Regle {
  constructor({ presence, absence } = {}) {
    this.presence = presence || [];
    this.absence = absence || [];
  }
}

module.exports = Regle;
