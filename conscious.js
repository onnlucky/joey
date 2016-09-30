"use strict"

const WIDTH = 10
const HEIGHT = 10
var field = [
    "          ",
    " XXR      ",
    "       BRB",
    "        B ",
    "          ",
    "          ",
    "  R   B   ",
    "  X   RB  ",
    "  X   B   ",
    "          ",
]
field.each((row, n)=> field[n] = row.split(""))

function look1(x, y) { return field[mod(y, HEIGHT)][mod(x, WIDTH)] }
function look(x, y, dir) {
    switch (dir) {
        case 0: return [look1(x+1, y-1), look1(x+1, y), look1(x+1, y+1)].join("")
        case 1: return [look1(x+1, y+1), look1(x, y+1), look1(x-1, y+1)].join("")
        case 2: return [look1(x-1, y+1), look1(x-1, y), look1(x-1, y-1)].join("")
        case 3: return [look1(x-1, y-1), look1(x, y-1), look1(x+1, y-1)].join("")
    }
}
assert(look(2, 0, 1) === "RXX")
assert(look(2, 2, 3) === "XXR")

var score = 0
var x = 0
var y = 0
var dir = 0
var currentPlan = null
var currentStep = 0

var plans = []
var stateHistory = []
var moveHistory = []

function record(state, move) {
    stateHistory.unshift(state)
    moveHistory.unshift(move)
    if (stateHistory.length > 20) {
        stateHistory.pop()
        moveHistory.pop()
    }
}

class Plan {
    constructor(reward) {
        this.states = []
        this.moves = []
        this.reward = reward
        this.weight = 1
    }

    add(state, move) {
        this.states.unshift(state)
        this.moves.unshift(move)
    }

    equals(other) {
        if (this.states.length != other.states.length) return false
        for (var i = 0, il = this.states.length; i < il; i++) {
            if (this.states[i] != other.states[i]) return false
            if (this.moves[i] != other.moves[i]) return false
        }
        return true
    }
}

function addPlan(plan) {
    for (var i = 0, il = plans.length; i < il; i++) {
        if (plans[i].equals(plan)) return false
    }
    plans.push(plan)
    return true
}

function clearHistory() {
    stateHistory.length = 0
    moveHistory.length = 0
}

function receiveReward(plan) {
    if (plan) {
        plan.weight += 0.5
    }

    var plan = new Plan(1)
    var empty = 0
    var rot = 0
    for (var i = 0, il = stateHistory.length; i < il; i++) {
        var move = moveHistory[i]
        if (move === 2) {
            rot = 0
        } else {
            if (move === 0) rot -= 1
            if (move === 1) rot += 1
            if (rot == 0 || rot == 2 || rot == -2) return
        }
        plan.add(stateHistory[i], move)
        if (stateHistory[i] === "   ") {
            if (empty >= 1) break
            empty += 1
            continue
        }
        empty = 0
        if (addPlan(plan)) break
    }
    clearHistory()
}

function receiveSurprise(plan) {
    plan.weight -= 0.1
    if (plan.weight <= 0) plans.remove(plan)
}

function matches(states, moves, plan) {
    for (var i = 0, il = states.length; i < il; i++) {
        if (plan.states[i] !== states[i]) return false
        if (i + 1 < il && plan.moves[i] !== moves[i]) return false
    }
    return true
}

function findPlan(state) {
    var candidates = []
    for (var i = 0, il = plans.length; i < il; i++) {
        var plan = plans[i]
        if (plan.states[0] === state) candidates.push(plan)
    }
    if (candidates.length === 0) return null

    var sum = candidates.reduce((s, plan)=>{ return s + plan.weight }, 0)
    var p = rnd() * sum
    for (var i = 0, il = candidates.length; i < il; i++) {
        var plan = candidates[i]
        p -= plan.weight
        if (p <= 0) return plan
    }
    return null
}

function think() {
    var state = look(x, y, dir)
    var move = -1
    if (currentPlan) {
        var expect = currentPlan.states[currentStep]
        if (state === expect) {
            move = currentPlan.moves[currentStep]
            currentStep += 1
        } else {
            receiveSurprise(currentPlan)
            currentPlan = null
        }
    }
    if (!currentPlan) {
        currentPlan = findPlan(state)
        if (currentPlan) {
            move = currentPlan.moves[0]
            currentStep = 1
        }
    }
    if (move < 0) move = rndint(3)
    record(state, move)

    if (move == 0) {
        dir = mod(dir - 1, 4)
    } else if (move == 1) {
        dir = mod(dir + 1, 4)
    } else {
        var nx = x, ny = y
        /**/ if (dir == 0) nx = mod(x + 1, WIDTH)
        else if (dir == 1) ny = mod(y + 1, HEIGHT)
        else if (dir == 2) nx = mod(x - 1, WIDTH)
        else if (dir == 3) ny = mod(y - 1, HEIGHT)

        assert(nx >= 0 && nx < WIDTH)
        assert(ny >= 0 && ny < HEIGHT)
        var c = field[ny][nx]
        if (c == "X") return
        x = nx; y = ny
        if (c == "R") {
            score += 1
            field[y][x] = " "
            rewardtimers.push({time:rndint(50), x, y})
            receiveReward(currentPlan)
            currentPlan = null
        }
    }
}

var rewardtimers = []
function step() {
    for (var i = 0, il = rewardtimers.length; i < il; i++) {
        var timer = rewardtimers[i]
        timer.time -= 1
        if (timer.time > 0) continue
        rewardtimers.splice(i, 1); i -= 1; il -= 1
        field[timer.y][timer.x] = "R"
    }
    think()
}

for (var i = 1; i <= 20000; i++) {
    step()
    if (i % 250 === 0) console.log(i, "plans:", plans.length, "score:", score)
}

console.log("best score:")
plans.sort((a, b)=> b.weight - a.weight).slice(0, 20).each(plan => console.log("plan:", JSON.stringify(plan)))
console.log("longest length:")
plans.sort((a, b)=> b.states.length - a.states.length).slice(0, 10).each(plan => console.log("plan:", JSON.stringify(plan)))

