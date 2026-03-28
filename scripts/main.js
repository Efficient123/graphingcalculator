// This uses an eval calculator. I have tried my best to make it as safe as possible by rejecting every
// request that might not be a mathematical equation. Still for safety purposes, always create a copy
// of your world before you invite others to play with this script. If you find a way to bypass the security
// walls. Please let me know at: https://discord.gg/cjSBcq4xhA

// Yes this code is very messy because I finished the project in a day. It just does it's work.

import {
    world,
    system
} from '@minecraft/server';

let graphPositions = [];
let unitMarkers = [];
let located = false;
let pdimension;
let origin;
const k = 0.5;
let plotedPos = [];
let currentSize = 30;
let donePlotting = false;
let plottedEq = '';
let derivativePlot = [];
let integrandPlot = [];
let totalIntegral = 0;
const integralConstant = 0.01;

const lettersExceptX = [
    "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
    "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "y", "z"
];
const graphAtPos = (player, size) => {
    const location = player.getHeadLocation();
    currentSize = size;
    pdimension = player.dimension;
    for (let i = 0; i < size; i = i + k) {
        let newLoc = {
            x: location.x,
            y: location.y + i,
            z: location.z
        };
        graphPositions.push(newLoc);
    }
    origin = graphPositions[Math.ceil(graphPositions.length / 2)]
    for (let i = -(size / 2); i < size / 2; i = i + k) {
        let newLoc = {
            x: location.x + i,
            y: location.y + size / 2,
            z: location.z
        };
        graphPositions.push(newLoc);
    }
    for (let i = 0; i < size; i++) {
        let newLoc = {
            x: location.x,
            y: location.y + i,
            z: location.z + 0.5
        };
        unitMarkers.push(newLoc);
    }
    for (let i = -(size / 2); i < size / 2; i++) {
        let newLoc = {
            x: location.x + i,
            y: location.y + size / 2,
            z: location.z + 0.5
        };
        unitMarkers.push(newLoc);
    }
    located = true;
}

const equationConverter = (str, sender, isDerivative = false, isIntegral = false, from, to) => {
    let expr = str.slice(1, -1).toLowerCase();

    const banned = ["console", "function", "eval", "global", "this", "constructor", "require", "process", "window"];
    if (banned.some(word => expr.includes(word))) {
        sender.sendMessage("Unsafe expression detected!");
        return;
    }

    if (!/^[0-9x+\-*/^().\sa-z]*$/.test(expr)) {
        sender.sendMessage("§cInvalid characters in equation!");
        return;
    }

    expr = expr.replace(/\bsin\b/g, "Math.sin")
        .replace(/\bcos\b/g, "Math.cos")
        .replace(/\btan\b/g, "Math.tan")
        .replace(/\blog\b/g, "Math.log")
        .replace(/\bsqrt\b/g, "Math.sqrt")
        .replace(/\babs\b/g, "Math.abs")
        .replace(/\bexp\b/g, "Math.exp")
        .replace(/\bceil\b/g, "Math.ceil")
        .replace(/\bfloor\b/g, "Math.floor");

    const allowedFunctions = [
        "Math.sin", "Math.cos", "Math.tan",
        "Math.log", "Math.sqrt", "Math.abs",
        "Math.exp", "Math.ceil", "Math.floor"
    ];

    const usedFunctions = expr.match(/Math\.\w+/g) || [];
    for (let fn of usedFunctions) {
        if (!allowedFunctions.includes(fn)) {
            sender.sendMessage("§cThat function is not allowed!");
            return;
        }
    }

    const invalidLetters = expr.replace(/Math\.\w+/g, '').match(/[a-wyz]/g);
    if (invalidLetters) {
        sender.sendMessage("Only 'x' is allowed as a variable! Please input mathematical equations only.");
        return;
    }

    expr = expr.replace(/(\d)(x)/g, "$1*$2")
        .replace(/(x)(\d)/g, "$1*$2")
        .replace(/\)(?=\w)/g, ")*")
        .replace(/(\d)(?=\()/g, "$1*")
        .replace(/(x)(?=\()/g, "$1*")
        .replace(/(\w+)\s*\^\s*(\w+)/g, "$1**$2");

    if (!isIntegral && !isDerivative) {
        plottedEq = expr;
    }

    equationConverterRaw(expr, sender, isDerivative, isIntegral, from, to);
};

const equationConverterRaw = (expr, sender, isDerivative = false, isIntegral = false, from, to) => {
    let calc;

    try {
        calc = new Function("x", `return ${expr};`);
    } catch {
        sender.sendMessage("Equation §c§lfailed §r§fto compile!");
        return;
    }

    if (!isIntegral) {
        for (let i = -(currentSize / 2); i < currentSize / 2; i += 0.25) {
            let yVal;
            try {
                yVal = calc(i);
            } catch {
                sender.sendMessage("§cEvaluation failed!");
                return;
            }

            if (isDerivative) {
                derivativePlot.push({
                    x: origin.x + i,
                    y: origin.y + yVal,
                    z: origin.z
                });
            } else {
                plotedPos.push({
                    x: origin.x + i,
                    y: origin.y + yVal,
                    z: origin.z
                });
                sender.onScreenDisplay.setActionBar(`§aPlotted: §f${expr}`);
            }
        }
    } else {
        for (let r = from; r < to; r += 0.25) {
            let yVal;
            try {
                yVal = calc(r);
            } catch {
                sender.sendMessage("§cEvaluation failed!");
                return;
            }

            if (yVal > 0) {
                for (let i = 1.2; i < yVal; i += 0.5) {
                    integrandPlot.push({
                        x: origin.x + r,
                        y: origin.y + i,
                        z: origin.z
                    });
                }
            } else {
                for (let i = 0; i > yVal + 1.2; i -= 0.5) {
                    integrandPlot.push({
                        x: origin.x + r,
                        y: origin.y + i,
                        z: origin.z
                    });
                }
            }
        }
    }
    donePlotting = true;
};

const derivative = (point, sender) => {
    let calc;
    try {
        calc = new Function("x", `return ${plottedEq}`);
    } catch (e) {
        sender.sendMessage("§7An error occurred!");
        console.warn(e);
        return;
    }

    try {
        let h = 0.0000001;
        let dxBydy = (calc(point + h) - calc(point)) / h;
        sender.sendMessage(`Derivative at §a${point} §fis: §a§l${dxBydy}`);
        sender.onScreenDisplay.setActionBar(`§eDerivative at §a${point} §e: §f${dxBydy}`);
        sender.playSound("random.orb");
    } catch (e) {
        console.warn(e);
        sender.sendMessage("An error occurred!");
        return;
    }
    if (Math.abs(point) >= currentSize / 2) {
        sender.sendMessage("§7Could not plot the derivative because it is outside of the shown region.");
        return;
    } else {
        let h = 0.0000001;
        const tangentLine = `${((calc(point + h) - calc(point)) / h)}*(x-${point}) + ${calc(point)}`;
        equationConverterRaw(tangentLine, sender, true);
    }
};

const integral = (from, to, sender) => {
    if (from === to) {
        sender.sendMessage("Same limits, really? The answer is zero by the way.");
        return;
    }
    const bfrom = Math.min(from, to);
    const bto = Math.max(from, to);
    totalIntegral = 0;
    let calc;
    try {
        calc = new Function("x", `return ${plottedEq}`);
    } catch (e) {
        sender.sendMessage("§cAn error occurred!");
        console.warn(e);
        return;
    }
    for (let i = bfrom; i < bto; i += integralConstant) {
        try {
            let ar = calc(i) * integralConstant;
            totalIntegral = totalIntegral + ar;
        } catch {
            console.warn(e);
            sender.sendMessage("§cAn error occurred!");
            return;
        };
    };
    sender.sendMessage(`The integration from §a${bfrom} §fto §a${bto} is §l${totalIntegral} square units.`);
    sender.onScreenDisplay.setActionBar(`§bIntegral from §a${bfrom} §bto §a${bto} §b: §f${totalIntegral} square units.`);
    sender.playSound("random.orb");
    if (Math.abs(from) > currentSize / 2 || Math.abs(to) > currentSize / 2) {
        sender.sendMessage("Could not show integral on the graph because the points are outside the drawn plot.");
        return;
    };
    equationConverterRaw(plottedEq, sender, false, true, bfrom, bto);
};

world.afterEvents.worldLoad.subscribe(() => {
    const players = world.getPlayers();
    for (let player of players) {
        player.sendMessage("§aRun §6!list §ato see the available commands!");
        player.playSound("random.orb");
    }
    world.afterEvents.chatSend.subscribe((e) => {
        const sender = e.sender;
        const msg = e.message;
        const parts = msg.split(" ");
        if (msg.startsWith("!graph")) {
            let input = parts[1];
            let value;
            sender.playSound("random.orb");
            if (!input) {
                value = 30;
            } else {
                value = Number(input);

                if (isNaN(value)) {
                    sender.sendMessage("§7That input is not allowed, creating a graph of default size: 30.");
                    value = 30;
                } else if (value < 0) {
                    sender.sendMessage("§7Size cannot be negative! Creating a graph of size 10.");
                    value = 10;
                } else if (value < 10) {
                    sender.sendMessage("§7Minimum allowed value is 10! Creating a graph of size 10.");
                    value = 10;
                } else if (value > 100) {
                    sender.sendMessage("§7Maximum allowed value is 100! Creating a graph of size 100.");
                    value = 100;
                }
            }

            if (parts.length > 2) {
                sender.sendMessage("§cInvalid format or too many arguments!");
                return;
            }
            derivativePlot = [];
            plotedPos = [];
            integrandPlot = [];
            totalIntegral = 0;
            located = false;
            graphPositions = [];
            unitMarkers = [];
            origin = undefined;
            donePlotting = false;
            graphAtPos(sender, value);
        }
        if (msg.startsWith("!plot")) {
            sender.playSound("random.orb");
            if (!located) {
                sender.sendMessage("§7Please initialize a graph.");
                return;
            }
            let func = msg.slice(6).trimEnd();
            func = func.toLowerCase();

            if (!func.startsWith('"') || !func.endsWith('"')) {
                sender.sendMessage('§7Invalid format! Wrap your equation around " ');
                return;
            }

            if (!func.includes('x')) {
                sender.sendMessage("§7Your equation must have X as a variable.");
                return;
            }
            plotedPos = [];
            integrandPlot = [];
            derivativePlot = [];
            totalIntegral = 0;
            equationConverter(func, sender);
        }
        if (msg.startsWith("!derivative")) {
            let input = parts[1];
            let value;
            sender.playSound("random.orb");
            if (!input) {
                sender.sendMessage("§7Please provide a point to find the derivative.");
                return;
            } else {
                value = Number(input);
                sender.sendMessage(`${value}`);
                if (isNaN(value)) {
                    sender.sendMessage("§7That input is not allowed!");
                    return;
                }
            }

            if (parts.length > 2) {
                sender.sendMessage("§cInvalid format or too many arguments!");
                return;
            }
            derivative(value, sender);
        }
        if (msg.startsWith("!integrate")) {
            let frm = parts[1];
            let to = parts[2];
            let value;
            sender.playSound("random.orb");
            if (!frm || !to) {
                sender.sendMessage("§7Please provide from and to to find the integral.");
                return;
            } else {
                frm = Number(frm);
                to = Number(to);
                if (isNaN(frm) || isNaN(to)) {
                    sender.sendMessage("§cThat input is not allowed!");
                    return;
                }
            }

            if (parts.length > 3) {
                sender.sendMessage("§cInvalid format or too many arguments!");
                return;
            }
            integral(frm, to, sender);
        }
        if ((msg.toLowerCase()).trimEnd() === "!clearderivative") {
            derivativePlot = [];
            sender.playSound("random.orb");
        }
        if ((msg.toLowerCase()).trimEnd() === "!clearintegral") {
            integrandPlot = [];
            totalIntegral = 0;
            sender.playSound("random.orb");
        }
        if ((msg.toLowerCase()).trimEnd() === "!clearall") {
            derivativePlot = [];
            plotedPos = [];
            integrandPlot = [];
            totalIntegral = 0;
            located = false;
            graphPositions = [];
            unitMarkers = [];
            origin = undefined;
            donePlotting = false;
            sender.playSound("random.orb");
        }
        if ((msg.toLowerCase()).trimEnd() === "!clearplot") {
            derivativePlot = [];
            plotedPos = [];
            integrandPlot = [];
            totalIntegral = 0;
            donePlotting = false;
            sender.playSound("random.orb");
        }
        if ((msg.toLowerCase()).trimEnd() === "!clearaxes") {
            graphPositions = [];
            unitMarkers = [];
            located = false;
            origin = undefined;
            sender.playSound("random.orb");
        }
        if ((msg.toLowerCase()).trimEnd() === "!list") {
            sender.sendMessage("§6!graph <size> §7--> §eSets up a graph of the provided size.");
            sender.sendMessage('§6!plot "<equation>" §7--> §ePlots the given equation. §cDo not write "=y." That is assumed.');
            sender.sendMessage('§6!derivative <point> §7--> §eFinds the derivative at the given point §band plots the tangent.');
            sender.sendMessage('§6!integrate <pointFrom> <pointTo> §7--> §eFinds the integral between the given upper and lower limit.');
            sender.sendMessage('§6!clearderivative §7--> §cRemoves the tangent drawn (if present).');
            sender.sendMessage('§6!clearintegral §7--> §cResets the integral sum and the visuals (if present).');
            sender.sendMessage('§6!clearall §7--> §cResets everything.');
            sender.sendMessage('§6!clearplot §7--> §cClears the plotted equation.');
            sender.sendMessage('§6!clearaxes §7--> §eClears the axes §7and preserves the plotted equation, integral, and derivative.');
            sender.playSound("random.orb");
        }
    });
})

system.runInterval(() => {
    if (located) {
        for (let i = 0; i < graphPositions.length; i++) {
            pdimension.spawnParticle("minecraft:heart_particle", graphPositions[i]);
        }
        for (let i = 0; i < unitMarkers.length; i++) {
            pdimension.spawnParticle("minecraft:basic_flame_particle", unitMarkers[i]);
        }
    }
    if (donePlotting) {
        for (let i = 0; i < plotedPos.length; i++) {
            try {
                pdimension.spawnParticle("minecraft:basic_flame_particle", plotedPos[i]);
            } catch {
                continue;
            }
        }
    }
    try {
        for (let p of derivativePlot) {
            pdimension.spawnParticle("minecraft:basic_flame_particle", p);
        }
    } catch { }
    try {
        for (let p of integrandPlot) {
            pdimension.spawnParticle("minecraft:basic_portal_particle", p);
        }
    } catch (e) {
        console.warn(e);
    }
}, 5);
