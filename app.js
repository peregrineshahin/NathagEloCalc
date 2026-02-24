function showModal(data) {
  const modal = document.getElementById("resultModal");
  const modalBody = document.getElementById("modalBody");

  modalBody.replaceChildren();

  if (typeof data === "object" && data !== null) {
    const dl = document.createElement("dl");
    dl.style.margin = "0";
    dl.style.padding = "0";

    for (const [key, value] of Object.entries(data)) {
      const dt = document.createElement("dt");
      dt.textContent = key;
      dt.style.fontWeight = "bold";
      dt.style.marginTop = "0.5em";

      const dd = document.createElement("dd");
      dd.textContent = value;
      dd.style.margin = "0 0 0.5em 0";

      dl.appendChild(dt);
      dl.appendChild(dd);
    }

    modalBody.appendChild(dl);
  } else {
    modalBody.textContent = data;
  }

  modal.classList.add("show");

  const closeModal = () => {
    modal.classList.remove("show");
    window.removeEventListener("keydown", handleEsc);
    window.removeEventListener("click", clickOutside);
  };

  modal.querySelector(".close").onclick = closeModal;

  const clickOutside = (event) => {
    if (event.target === modal) closeModal();
  };
  window.addEventListener("click", clickOutside);

  const handleEsc = (event) => {
    if (event.key === "Escape" || event.key === "Enter") closeModal();
  };
  window.addEventListener("keydown", handleEsc);
}

function score_to_elo(score) {
  return (-400 * Math.log(1 / score - 1)) / Math.LN10;
}

function elo_to_score(elo) {
  return 1 / (1 + Math.pow(10, -elo / 400));
}

function score_to_nelo_penta(score, std_deviation) {
  return ((score - 0.5) / (Math.sqrt(2) * std_deviation)) * (800 / Math.LN10);
}

function score_to_nelo_wdl(score, std_deviation) {
  return ((score - 0.5) / std_deviation) * (800 / Math.LN10);
}

function nelo_to_score_penta(nelo, std_deviation) {
  return (nelo * Math.sqrt(2) * std_deviation) / (800 / Math.LN10) + 0.5;
}

function score_to_bayeselo(score, drawelo) {
  x = Math.pow(10, -drawelo / 400);
  return score_to_elo(score) / ((4 * x) / Math.pow(1 + x, 2));
}

function bayeselo_to_score(bayeselo, drawelo) {
  let pwin = 1.0 / (1.0 + Math.pow(10.0, (-bayeselo + drawelo) / 400.0));
  let ploss = 1.0 / (1.0 + Math.pow(10.0, (bayeselo + drawelo) / 400.0));
  let pdraw = 1.0 - pwin - ploss;
  return pwin + 0.5 * pdraw + 0 * ploss;
}

function nelo_to_score_wdl(nelo, std_deviation) {
  return (nelo * std_deviation) / (800 / Math.LN10) + 0.5;
}

function ncdf(x, mean, std) {
  x = (x - mean) / std;
  let t = 1 / (1 + 0.2315419 * Math.abs(x));
  let d = 0.3989423 * Math.exp((-x * x) / 2);
  let prob =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (x > 0) {
    prob = 1 - prob;
  }
  return prob;
}

function calculateWDLElo() {
  let losses = parseFloat(document.getElementById("losses").value);
  let draws = parseFloat(document.getElementById("draws").value);
  let wins = parseFloat(document.getElementById("wins").value);
  let total_games = losses + draws + wins;
  let points = losses * 0 + draws * 0.5 + wins * 1;
  let score = points / total_games;
  let score_in_percent = score * 100;

  let losses_ratio = losses / total_games;
  let draws_ratio = draws / total_games;
  let wins_ratio = wins / total_games;

  let losses_dev = losses_ratio * Math.pow(0 - score, 2);
  let draws_dev = draws_ratio * Math.pow(0.5 - score, 2);
  let wins_dev = wins_ratio * Math.pow(1 - score, 2);
  let variance = losses_dev + draws_dev + wins_dev;
  let std_deviation = Math.sqrt(variance);

  let zscore;
  let errormargin = document.getElementById("errormarginWDL").value;
  if (errormargin == "CI95") {
    zscore = 1.959963984540054;
  } else if (errormargin == "CI80") {
    zscore = 1.2815515655446004;
  } else if (errormargin == "CI85") {
    zscore = 1.4395314709384557;
  } else if (errormargin == "CI90") {
    zscore = 1.6448536269514729;
  } else if (errormargin == "CI99") {
    zscore = 2.5758293035489004;
  } else if (errormargin == "sigma1") {
    zscore = 1;
  } else if (errormargin == "sigma2") {
    zscore = 2;
  } else if (errormargin == "sigma3") {
    zscore = 3;
  } else if (errormargin == "sigma4") {
    zscore = 4;
  } else if (errormargin == "sigma5") {
    zscore = 5;
  } else if (errormargin == "sigma6") {
    zscore = 6;
  }
  let score_lower_bound =
    score - (zscore * std_deviation) / Math.sqrt(total_games);
  let score_upper_bound =
    score + (zscore * std_deviation) / Math.sqrt(total_games);
  let score_error_margin = (score_upper_bound - score_lower_bound) / 2;

  let elo = score_to_elo(score);
  let elo_lower_bound = score_to_elo(score_lower_bound);
  let elo_upper_bound = score_to_elo(score_upper_bound);
  let elo_error_margin_lower = elo - elo_lower_bound;
  let elo_error_margin_upper = elo_upper_bound - elo;

  let nelo = score_to_nelo_wdl(score, std_deviation);
  let nelo_lower_bound = score_to_nelo_wdl(score_lower_bound, std_deviation);
  let nelo_upper_bound = score_to_nelo_wdl(score_upper_bound, std_deviation);
  let nelo_error_margin_lower = nelo - nelo_lower_bound;
  let nelo_error_margin_upper = nelo_upper_bound - nelo;

  let LOS =
    (1 - ncdf(0, score - 0.5, std_deviation / Math.sqrt(total_games))) * 100;

  let win_loss_ratio = wins / losses;

  let drawelo =
    200 *
    Math.log10(
      (((1 - losses_ratio) / losses_ratio) * (1 - wins_ratio)) / wins_ratio,
    );
  let bayeselo = score_to_bayeselo(score, drawelo);
  let bayeselo_lower_bound = score_to_bayeselo(score_lower_bound, drawelo);
  let bayeselo_upper_bound = score_to_bayeselo(score_upper_bound, drawelo);
  let bayeselo_error_margin_lower = bayeselo - bayeselo_lower_bound;
  let bayeselo_error_margin_upper = bayeselo_upper_bound - bayeselo;

  let elo0 = parseFloat(document.getElementById("elo0wdl").value);
  let elo1 = parseFloat(document.getElementById("elo1wdl").value);
  let eloType = document.getElementById("eloTypeWDL").value;
  let score0;
  let score1;
  if (eloType == "BayesElo") {
    score0 = bayeselo_to_score(elo0, drawelo);
    score1 = bayeselo_to_score(elo1, drawelo);
  } else if (eloType == "Elo") {
    score0 = elo_to_score(elo0);
    score1 = elo_to_score(elo1);
  } else {
    score0 = nelo_to_score_wdl(elo0, std_deviation);
    score1 = nelo_to_score_wdl(elo1, std_deviation);
  }

  let losses_dev0 = losses_ratio * Math.pow(0 - score0, 2);
  let draws_dev0 = draws_ratio * Math.pow(0.5 - score0, 2);
  let wins_dev0 = wins_ratio * Math.pow(1 - score0, 2);
  let variance0 = losses_dev0 + draws_dev0 + wins_dev0;
  let losses_dev1 = losses_ratio * Math.pow(0 - score1, 2);
  let draws_dev1 = draws_ratio * Math.pow(0.5 - score1, 2);
  let wins_dev1 = wins_ratio * Math.pow(1 - score1, 2);
  let variance1 = losses_dev1 + draws_dev1 + wins_dev1;
  let llr = 0.5 * total_games * Math.log(variance0 / variance1);

  showModal({
    Points: `${points} / ${total_games} (${score_in_percent.toFixed(2)}%)`,
    Elo: `${elo.toFixed(2)} (-${elo_error_margin_lower.toFixed(2)} / +${elo_error_margin_upper.toFixed(2)}) [${elo_lower_bound.toFixed(2)} to ${elo_upper_bound.toFixed(2)}]`,
    nElo: `${nelo.toFixed(2)} (-${nelo_error_margin_lower.toFixed(2)} / +${nelo_error_margin_upper.toFixed(2)}) [${nelo_lower_bound.toFixed(2)} to ${nelo_upper_bound.toFixed(2)}]`,
    BayesElo: `${bayeselo.toFixed(2)} (-${bayeselo_error_margin_lower.toFixed(2)} / +${bayeselo_error_margin_upper.toFixed(2)}) [${bayeselo_lower_bound.toFixed(2)} to ${bayeselo_upper_bound.toFixed(2)}]`,
    DrawElo: `${drawelo.toFixed(2)}`,
    LOS: `${LOS.toFixed(2)}%`,
    "W/L Ratio": `${win_loss_ratio.toFixed(2)}`,
    "Draw Ratio": `${draws_ratio.toFixed(2)}`,
    LLR: `${llr.toFixed(4)}`,
    Variance: `${variance.toFixed(4)}`,
  });
}

function calculatePentanomialElo() {
  const mode = document.getElementById("pentaInputMode").value;
  let counts;

  if (mode === "array") {
    const arrayInput = document.getElementById("pentaArray").value.trim();
    try {
      let cleanedInput = arrayInput.replace(/^\[|\]$/g, "");
      counts = cleanedInput.split(",").map(Number);

      if (!Array.isArray(counts) || counts.length !== 5 || counts.some(isNaN)) {
        throw "Invalid array length or values";
      }
    } catch {
      alert(
        "Invalid array input! Use format: [LL,LD,WLDD,WD,WW] or LL,LD,WLDD,WD,WW",
      );
      return;
    }
  } else {
    counts = [
      parseFloat(document.getElementById("LL").value),
      parseFloat(document.getElementById("LD").value),
      parseFloat(document.getElementById("WLDD").value),
      parseFloat(document.getElementById("WD").value),
      parseFloat(document.getElementById("WW").value),
    ];
  }

  const [LL, LD, WLDD, WD, WW] = counts;

  let total_pairs = LL + LD + WLDD + WD + WW;
  let points = LL * 0 + LD * 0.25 + WLDD * 0.5 + WD * 0.75 + WW * 1;
  let score = points / total_pairs;
  let score_in_percent = score * 100;

  let LL_ratio = LL / total_pairs;
  let LD_ratio = LD / total_pairs;
  let WLDD_ratio = WLDD / total_pairs;
  let WD_ratio = WD / total_pairs;
  let WW_ratio = WW / total_pairs;

  let LL_dev = LL_ratio * Math.pow(0 - score, 2);
  let LD_dev = LD_ratio * Math.pow(0.25 - score, 2);
  let WLDD_dev = WLDD_ratio * Math.pow(0.5 - score, 2);
  let WD_dev = WD_ratio * Math.pow(0.75 - score, 2);
  let WW_dev = WW_ratio * Math.pow(1 - score, 2);
  let variance = LL_dev + LD_dev + WLDD_dev + WD_dev + WW_dev;
  let std_deviation = Math.sqrt(variance);

  let zscore;
  let errormargin = document.getElementById("errormarginPenta").value;
  if (errormargin == "CI95") {
    zscore = 1.959963984540054;
  } else if (errormargin == "CI80") {
    zscore = 1.2815515655446004;
  } else if (errormargin == "CI85") {
    zscore = 1.4395314709384557;
  } else if (errormargin == "CI90") {
    zscore = 1.6448536269514729;
  } else if (errormargin == "CI99") {
    zscore = 2.5758293035489004;
  } else if (errormargin == "sigma1") {
    zscore = 1;
  } else if (errormargin == "sigma2") {
    zscore = 2;
  } else if (errormargin == "sigma3") {
    zscore = 3;
  } else if (errormargin == "sigma4") {
    zscore = 4;
  } else if (errormargin == "sigma5") {
    zscore = 5;
  } else if (errormargin == "sigma6") {
    zscore = 6;
  }
  let score_lower_bound =
    score - (zscore * std_deviation) / Math.sqrt(total_pairs);
  let score_upper_bound =
    score + (zscore * std_deviation) / Math.sqrt(total_pairs);
  let score_error_margin = (score_upper_bound - score_lower_bound) / 2;

  let elo = score_to_elo(score);
  let elo_lower_bound = score_to_elo(score_lower_bound);
  let elo_upper_bound = score_to_elo(score_upper_bound);
  let elo_error_margin_lower = elo - elo_lower_bound;
  let elo_error_margin_upper = elo_upper_bound - elo;

  let nelo = score_to_nelo_penta(score, std_deviation);
  let nelo_lower_bound = score_to_nelo_penta(score_lower_bound, std_deviation);
  let nelo_upper_bound = score_to_nelo_penta(score_upper_bound, std_deviation);
  let nelo_error_margin_lower = nelo - nelo_lower_bound;
  let nelo_error_margin_upper = nelo_upper_bound - nelo;

  let LOS =
    (1 - ncdf(0, score - 0.5, std_deviation / Math.sqrt(total_pairs))) * 100;

  let pairs_ratio = (WW + WD) / (LL + LD);

  let gamepairs_L_score = (LL + LD) / total_pairs;
  let gamepairs_D_score = WLDD / total_pairs;
  let gamepairs_W_score = (WW + WD) / total_pairs;
  let gamepairs_score =
    ((LL + LD) * 0 + WLDD * 0.5 + (WD + WW) * 1) / total_pairs;

  let gamepairs_L_dev = gamepairs_L_score * Math.pow(0 - gamepairs_score, 2);
  let gamepairs_D_dev = gamepairs_D_score * Math.pow(0.5 - gamepairs_score, 2);
  let gamepairs_W_dev = gamepairs_W_score * Math.pow(1 - gamepairs_score, 2);
  let gamepairs_variance = gamepairs_L_dev + gamepairs_D_dev + gamepairs_W_dev;
  let gamepairs_std_deviation = Math.sqrt(gamepairs_variance);

  let gamepairs_score_lower_bound =
    gamepairs_score -
    (zscore * gamepairs_std_deviation) / Math.sqrt(total_pairs);
  let gamepairs_score_upper_bound =
    gamepairs_score +
    (zscore * gamepairs_std_deviation) / Math.sqrt(total_pairs);
  let gamepairs_score_error_margin =
    (gamepairs_score_upper_bound - gamepairs_score_lower_bound) / 2;

  let gamepairs_elo = score_to_elo(gamepairs_score);
  let gamepairs_elo_lower_bound = score_to_elo(gamepairs_score_lower_bound);
  let gamepairs_elo_upper_bound = score_to_elo(gamepairs_score_upper_bound);
  let gamepairs_elo_error_margin_lower =
    gamepairs_elo - gamepairs_elo_lower_bound;
  let gamepairs_elo_error_margin_upper =
    gamepairs_elo_upper_bound - gamepairs_elo;

  let normalized_pair_elo = -100 * Math.log10((2 * LL + LD) / (2 * WW + WD));

  let elo0 = parseFloat(document.getElementById("elo0penta").value);
  let elo1 = parseFloat(document.getElementById("elo1penta").value);
  let eloType = document.getElementById("eloTypePenta").value;
  let score0;
  let score1;
  if (eloType == "nElo") {
    score0 = nelo_to_score_penta(elo0, std_deviation);
    score1 = nelo_to_score_penta(elo1, std_deviation);
  } else {
    score0 = elo_to_score(elo0);
    score1 = elo_to_score(elo1);
  }

  let LL_dev0 = LL_ratio * Math.pow(0 - score0, 2);
  let LD_dev0 = LD_ratio * Math.pow(0.25 - score0, 2);
  let WLDD_dev0 = WLDD_ratio * Math.pow(0.5 - score0, 2);
  let WD_dev0 = WD_ratio * Math.pow(0.75 - score0, 2);
  let WW_dev0 = WW_ratio * Math.pow(1 - score0, 2);
  let variance0 = LL_dev0 + LD_dev0 + WLDD_dev0 + WD_dev0 + WW_dev0;
  let LL_dev1 = LL_ratio * Math.pow(0 - score1, 2);
  let LD_dev1 = LD_ratio * Math.pow(0.25 - score1, 2);
  let WLDD_dev1 = WLDD_ratio * Math.pow(0.5 - score1, 2);
  let WD_dev1 = WD_ratio * Math.pow(0.75 - score1, 2);
  let WW_dev1 = WW_ratio * Math.pow(1 - score1, 2);
  let variance1 = LL_dev1 + LD_dev1 + WLDD_dev1 + WD_dev1 + WW_dev1;
  let llr = 0.5 * total_pairs * Math.log(variance0 / variance1);

  showModal({
    Points: `${points * 2} / ${total_pairs * 2} (${score_in_percent.toFixed(2)}%)`,
    Elo: `${elo.toFixed(2)} (-${elo_error_margin_lower.toFixed(2)} / +${elo_error_margin_upper.toFixed(2)}) [${elo_lower_bound.toFixed(2)} to ${elo_upper_bound.toFixed(2)}]`,
    nElo: `${nelo.toFixed(2)} (-${nelo_error_margin_lower.toFixed(2)} / +${nelo_error_margin_upper.toFixed(2)}) [${nelo_lower_bound.toFixed(2)} to ${nelo_upper_bound.toFixed(2)}]`,
    "Gamepairs Elo": `${gamepairs_elo.toFixed(2)} (-${gamepairs_elo_error_margin_lower.toFixed(2)} / +${gamepairs_elo_error_margin_upper.toFixed(2)}) [${gamepairs_elo_lower_bound.toFixed(2)} to ${gamepairs_elo_upper_bound.toFixed(2)}]`,
    "Normalized Pair Elo": `${normalized_pair_elo.toFixed(2)}`,
    LOS: `${LOS.toFixed(2)}%`,
    "Pairs Ratio": `${pairs_ratio.toFixed(2)}`,
    "Draw Ratio": `${WLDD_ratio.toFixed(2)}`,
    LLR: `${llr.toFixed(4)}`,
    Variance: `${variance.toFixed(4)}`,
  });
}

function calculateSPRT() {
  let elo = parseFloat(document.getElementById("Elo").value);
  let variance = parseFloat(document.getElementById("Variance").value);
  let elo0 = parseFloat(document.getElementById("elo0").value);
  let elo1 = parseFloat(document.getElementById("elo1").value);
  let elotype = document.getElementById("eloType").value;
  let model = document.getElementById("model").value;
  let alpha = parseFloat(document.getElementById("alpha").value);
  let beta = parseFloat(document.getElementById("beta").value);
  let score = elo_to_score(elo);
  let score0;
  let score1;

  if (model == "Pentanomial") {
    score0 = nelo_to_score_penta(elo0, Math.sqrt(variance));
    score1 = nelo_to_score_penta(elo1, Math.sqrt(variance));
  } else {
    score0 = nelo_to_score_wdl(elo0, Math.sqrt(variance));
    score1 = nelo_to_score_wdl(elo1, Math.sqrt(variance));
  }
  if (elotype == "Elo") {
    score0 = elo_to_score(elo0);
    score1 = elo_to_score(elo1);
  }

  let w2 = Math.pow(score1 - score0, 2) / variance;
  let LA = Math.log(beta / (1 - alpha));
  let LB = Math.log((1 - beta) / alpha);
  let h = (2.0 * score - (score0 + score1)) / (score1 - score0);
  let pass_prob;
  let expected_games;
  if (Math.abs(h * (LA - LB)) < 0.000001) {
    // avoid division by zero
    pass_prob = -LA / (LB - LA);
    expected_games = (-LA * LB) / w2;
  } else {
    let exp_a = Math.exp(-h * LA);
    let exp_b = Math.exp(-h * LB);
    pass_prob = (1 - exp_a) / (exp_b - exp_a);
    expected_games = ((2 / h) * (LB * pass_prob + LA * (1 - pass_prob))) / w2;
  }

  if (model == "Pentanomial") {
    expected_games = expected_games * 2;
  }

  showModal({
    "Pass Probability": `${(pass_prob * 100).toFixed(2)}%`,
    "Expected # of games": `${expected_games.toFixed(0)}`,
  });
}

function togglePentaInputMode() {
  const mode = document.getElementById("pentaInputMode").value;
  const arrayLabel = document.getElementById("pentaArrayLabel");
  const singleInputs = document
    .getElementById("pentaSingleInputs")
    .querySelectorAll("input");
  const arrayInput = document.getElementById("pentaArray");

  if (mode === "array") {
    arrayLabel.style.display = "block";
    document.getElementById("pentaSingleInputs").style.display = "none";
    singleInputs.forEach((input) => input.removeAttribute("required"));
    arrayInput.setAttribute("required", "true");
  } else {
    arrayLabel.style.display = "none";
    document.getElementById("pentaSingleInputs").style.display = "grid";
    singleInputs.forEach((input) => input.setAttribute("required", "true"));
    arrayInput.removeAttribute("required");
  }
}
