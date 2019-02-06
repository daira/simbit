/*
	Attack Simulation
*/

var net = require("./network"),
    peermgr = require("./peermgr"),
    btc = require("./btc"),
	client = new net.Client()

btc.Blockchain.Block.prototype.target_avg_between_blocks = 2.5 * 60 * 1000; // 2.5 minute blocks
btc.Blockchain.GenesisBlock.difficulty = 3700;
//btc.Blockchain.GenesisBlock.difficulty = 150000;

var difficultyAlgorithms = ['Zcash'];
function setDifficultyAlgorithm(choice) {
	var digishieldUseMedianTime = true;
	var midasDisableCalendarSync = false;
	console.log("Choice: " + choice);

	switch (choice) {
		case 'Bitcoin':
btc.Blockchain.Block.prototype.difficulty_adjustment_period = 500;
btc.Blockchain.Block.prototype.difficultyAdjustment = function() {
		var total = 0;
		var last = this.time;
		var cur = this._prev();

		if (!cur)
			return;

		for (var i=0;cur&&i<this.difficulty_adjustment_period;i++) {
			total += last - cur.time;
			last = cur.time;
			cur = cur._prev()
		}
		var avg = total / this.difficulty_adjustment_period;

		if (avg < this.target_avg_between_blocks/4)
			avg = this.target_avg_between_blocks/4;
		if (avg > this.target_avg_between_blocks*4)
			avg = this.target_avg_between_blocks*4;

		var old = this.difficulty;
		this.difficulty *= this.target_avg_between_blocks / avg;

		if (this.difficulty < this.proof_of_work_limit) {
			this.difficulty = this.proof_of_work_limit;
		}

		console.log("(h=" + this.h + ") difficulty adjustment " + (this.target_avg_between_blocks / avg) + "x")
	};
			break;

		case 'Bitcoin every block':
btc.Blockchain.Block.prototype.difficulty_adjustment_period = 1;
btc.Blockchain.Block.prototype.difficultyAdjustment = function() {
		var difficulty_adjustment_window = 500;
		var total = 0;
		var last = this.time;
		var cur = this._prev();

		if (!cur)
			return;

		var i = 0;
		for (;cur&&i<difficulty_adjustment_window;i++) {
			total += last - cur.time;
			last = cur.time;
			cur = cur._prev()
		}
		var avg = total / i;

		if (avg < this.target_avg_between_blocks/4)
			avg = this.target_avg_between_blocks/4;
		if (avg > this.target_avg_between_blocks*4)
			avg = this.target_avg_between_blocks*4;

		var old = this.difficulty;
		this.difficulty *= this.target_avg_between_blocks / avg;

		if (this.difficulty < this.proof_of_work_limit) {
			this.difficulty = this.proof_of_work_limit;
		}

		console.log("(h=" + this.h + ") difficulty adjustment " + (this.target_avg_between_blocks / avg) + "x")
	};
			break;

		case 'DigiShield v3 without median':
			digishieldUseMedianTime = false;
		case 'DigiShield v3':
function getMedianTimePast(b) {
	if (!digishieldUseMedianTime)
		return b.time;

	var nMedianTimeSpan = 11;

	var times = [];
	var pindex = b;
	for (var i = 0; i < nMedianTimeSpan && pindex; i++) {
		times.push(pindex.time);
		pindex = pindex._prev();
	}

	times.sort();
	return times[Math.floor(times.length/2)];
}
btc.Blockchain.Block.prototype.difficulty_adjustment_period = 1;
btc.Blockchain.Block.prototype.difficultyAdjustment = function() {
	var nAveragingInterval = 10; // 10 blocks
	var nAveragingTargetTimespan = nAveragingInterval * this.target_avg_between_blocks;

	var nMaxAdjustDownV3 = 16; // 16% adjustment down
	var nMaxAdjustUpV3 = 8; // 8% adjustment up

	var nMinActualTimespanV3 = nAveragingTargetTimespan * (100 - nMaxAdjustUpV3) / 100;
	var nMaxActualTimespanV3 = nAveragingTargetTimespan * (100 + nMaxAdjustDownV3) / 100;

	var first = this._prev();
	for (var i=0; first && i<nAveragingInterval; i++) {
		first = first._prev();
	}
	if (!first) {
		this.difficulty = this.proof_of_work_limit; // not enough blocks available
		console.log("(h=" + this.h + ") difficulty at minimum");
		return;
	}

	// Limit adjustment step
	// Use medians to prevent time-warp attacks
	var nActualTimespan = getMedianTimePast(this) - getMedianTimePast(first);
	nActualTimespan = nAveragingTargetTimespan + (nActualTimespan - nAveragingTargetTimespan)/6
	if (nActualTimespan < nMinActualTimespanV3) {
		nActualTimespan = nMinActualTimespanV3
	}
	if (nActualTimespan > nMaxActualTimespanV3) {
		nActualTimespan = nMaxActualTimespanV3
	}

	// Global retarget
	this.difficulty *= nAveragingTargetTimespan / nActualTimespan;

	if (this.difficulty < this.proof_of_work_limit) {
		this.difficulty = this.proof_of_work_limit;
	}

	console.log("(h=" + this.h + ") difficulty adjustment " + (nAveragingTargetTimespan / nActualTimespan) + "x")
};
			break;

		// Dark Gravity Wave v3
		case 'Dark Gravity Wave v3':
btc.Blockchain.Block.prototype.difficulty_adjustment_period = 1;
btc.Blockchain.Block.prototype.difficultyAdjustment = function() {
    var BlockLastSolved = this._prev();
    var BlockReading = this._prev();
    var nActualTimespan = 0;
    var LastBlockTime = 0;
    var PastBlocksMin = 24;
    var PastBlocksMax = 24;
    var CountBlocks = 0;
    var PastDifficultyAverage;
    var PastDifficultyAveragePrev;

    if (!BlockLastSolved || BlockLastSolved.h == 0 || BlockLastSolved.h < PastBlocksMin) {
        return this.proof_of_work_limit;
    }

    for (var i = 1; BlockReading && BlockReading.h > 0; i++) {
        if (PastBlocksMax > 0 && i > PastBlocksMax) { break; }
        CountBlocks++;

        if(CountBlocks <= PastBlocksMin) {
            if (CountBlocks == 1) { PastDifficultyAverage = BlockReading.difficulty; }
            else { PastDifficultyAverage = ((PastDifficultyAveragePrev * CountBlocks) + BlockReading.difficulty) / (CountBlocks + 1); }
            PastDifficultyAveragePrev = PastDifficultyAverage;
        }

        if(LastBlockTime > 0){
            var Diff = (LastBlockTime - BlockReading.time);
            nActualTimespan += Diff;
        }
        LastBlockTime = BlockReading.time;

        if (!BlockReading._prev()) { break; }
        BlockReading = BlockReading._prev();
    }

    this.difficulty = PastDifficultyAverage;

    var _nTargetTimespan = CountBlocks * this.target_avg_between_blocks;

    if (nActualTimespan < _nTargetTimespan/3)
        nActualTimespan = _nTargetTimespan/3;
    if (nActualTimespan > _nTargetTimespan*3)
        nActualTimespan = _nTargetTimespan*3;

    // Retarget
    this.difficulty *= _nTargetTimespan / nActualTimespan;

    if (this.difficulty < this.proof_of_work_limit) {
        this.difficulty = this.proof_of_work_limit;
    }

    console.log("(h=" + this.h + ") difficulty adjustment " + (_nTargetTimespan / nActualTimespan) + "x")
};
			break;

		case 'Zcash':
		default:
function getMedianTimePast(b) {
	var nMedianTimeSpan = 11;

	var times = [];
	var pindex = b;
	for (var i = 0; i < nMedianTimeSpan && pindex; i++) {
		times.push(pindex.time);
		pindex = pindex._prev();
	}

	times.sort();
        return times[Math.floor(times.length/2)];
}
btc.Blockchain.Block.prototype.difficulty_adjustment_period = 1;
btc.Blockchain.Block.prototype.difficultyAdjustment = function() {
	var nAveragingInterval = 17;
        var nTargetSpacing = this.target_avg_between_blocks;
        if (BlossomActive) {
		nTargetSpacing /= BlossomPoWTargetSpacingRatio;
	}
	var nAveragingTargetTimespan = nAveragingInterval * nTargetSpacing;

	var nMaxAdjustDownV3 = 32; // 16% adjustment down
	var nMaxAdjustUpV3 = 16; // 8% adjustment up

	var nMinActualTimespanV3 = nAveragingTargetTimespan * (100 - nMaxAdjustUpV3) / 100;
	var nMaxActualTimespanV3 = nAveragingTargetTimespan * (100 + nMaxAdjustDownV3) / 100;

	var tmpTot = 0;
	var first = this;
	for (var i=0; first && i<nAveragingInterval; i++) {
		tmpTot = tmpTot + first.difficulty;
		first = first._prev();
	}
	if (!first) {
		this.difficulty = this.proof_of_work_limit; // not enough blocks available
		console.log("(h=" + this.h + ") difficulty at minimum");
		return;
	}
	var avgDiff = tmpTot / nAveragingInterval;

	// Limit adjustment step
	// Use medians to prevent time-warp attacks
	var nActualTimespan = getMedianTimePast(this) - getMedianTimePast(first);
	nActualTimespan = nAveragingTargetTimespan + (nActualTimespan - nAveragingTargetTimespan)/4
	if (nActualTimespan < nMinActualTimespanV3) {
		nActualTimespan = nMinActualTimespanV3
	}
	if (nActualTimespan > nMaxActualTimespanV3) {
		nActualTimespan = nMaxActualTimespanV3
	}

	// Global retarget
	this.difficulty = avgDiff * nAveragingTargetTimespan / nActualTimespan;

	if (this.difficulty < this.proof_of_work_limit) {
		this.difficulty = this.proof_of_work_limit;
	}

	console.log("(h=" + this.h + ") difficulty adjustment " + (nAveragingTargetTimespan / nActualTimespan) + "x")
};
			break;

		case 'zawy':
btc.Blockchain.Block.prototype.difficulty_adjustment_period = 1;
btc.Blockchain.Block.prototype.difficultyAdjustment = function() {
	if (this._prev()) {
		this.nAveragingInterval = this._prev().nAveragingInterval;
	} else {
		this.nAveragingInterval = 2;
	}
	// Check the last few blocks for spikes
	var nCheckInterval = 2;
	var nAveragingTargetTimespan = nCheckInterval * this.target_avg_between_blocks;

	var sumDifficulties = this.difficulty;
	var first = this._prev();
	for (var i=0; first && i<nCheckInterval; i++) {
		sumDifficulties = sumDifficulties + first.difficulty;
		first = first._prev();
	}
	if (!first) {
		this.difficulty = this.proof_of_work_limit; // not enough blocks available
		console.log("(h=" + this.h + ") difficulty at minimum");
		return;
	}

	var nActualTimespan = this.time - first.time;
	if (nActualTimespan < nAveragingTargetTimespan*0.18) {
		console.log("Timespan too short");
		this.nAveragingInterval = 2;
	}
	if (nActualTimespan > nAveragingTargetTimespan*2.5) {
		console.log("Timespan too long");
		this.nAveragingInterval = 2;
	}

	// Now calculate the actual interval
	for (var i=nCheckInterval; first && i<this.nAveragingInterval; i++) {
		sumDifficulties = sumDifficulties + first.difficulty;
		first = first._prev();
	}
	if (!first) {
		this.difficulty = this.proof_of_work_limit; // not enough blocks available
		console.log("(h=" + this.h + ") difficulty at minimum");
		return;
	}
	nActualTimespan = this.time - first.time;

	// Global retarget
	var newDiff = sumDifficulties * this.target_avg_between_blocks / nActualTimespan;
	var adjustment = newDiff / this.difficulty;
	this.difficulty = newDiff;

	if (this.difficulty < this.proof_of_work_limit) {
		this.difficulty = this.proof_of_work_limit;
	}

	if (this.nAveragingInterval < 25) {
		this.nAveragingInterval++;
	}

	console.log("(h=" + this.h + ") difficulty adjustment " + adjustment + "x, new N = " + this.nAveragingInterval)
};
			break;

		case 'Ethereum':
btc.Blockchain.Block.prototype.difficulty_adjustment_period = 1;
btc.Blockchain.Block.prototype.difficultyAdjustment = function() {
	var BLOCK_DIFF_FACTOR = 2048;
	var HOMESTEAD_DIFF_ADJUSTMENT_CUTOFF = 10;
	var MIN_DIFF = 131072;
	// Exponential difficulty timebomb period
	var EXPDIFF_PERIOD = 100000;
	var EXPDIFF_FREE_PERIODS = 2;

	var parent_timestamp = this._prev().time;
	var parent_diff = this._prev().difficulty;

	var offset = Math.floor(parent_diff / BLOCK_DIFF_FACTOR);
	var sign = Math.max(1 - Math.floor((this.time - parent_timestamp) / HOMESTEAD_DIFF_ADJUSTMENT_CUTOFF), -99);
	// If we enter a special mode where the genesis difficulty starts off below
	// the minimal difficulty, we allow low-difficulty blocks (this will never
	// happen in the official protocol)
	var o = Math.floor(Math.max(parent_diff + offset * sign, Math.min(parent_diff, MIN_DIFF)));
	var period_count = Math.floor(this.h / EXPDIFF_PERIOD);
	if (period_count >= EXPDIFF_FREE_PERIODS)
		o = Math.max(o + Math.pow(2, period_count - EXPDIFF_FREE_PERIODS), MIN_DIFF);
	console.log('Calculating difficulty of block ' + this.h +
		', timestamp difference ' + (this.time - parent_timestamp) +
		', parent diff ' + parent_diff + ', child diff ' + o);

	this.difficulty = o;
};
			break;

		case 'MIDAS w/o CalSync':
			midasDisableCalendarSync = true;
		case 'MIDAS':
// This is MIDAS (Multi Interval Difficulty Adjustment System), a novel getnextwork algorithm.  It responds quickly to
// huge changes in hashing power, is immune to time warp attacks, and regulates the block rate to keep the block height
// close to the block height expected given the nominal block interval and the elapsed time.  How close the
// correspondence between block height and wall clock time is, depends on how stable the hashing power has been.  Maybe
// Bitcoin can wait 2 weeks between updates but no altcoin can.

// It is important that none of these intervals (5, 7, 9, 17) have any common divisor; eliminating the existence of
// harmonics is an important part of eliminating the effectiveness of timewarp attacks.
function avgRecentTimestamps(pindexLast) {
  var blockoffset = 0;
  var oldblocktime;
  var blocktime;

  var avgOf5 = 0;
  var avgOf7 = 0;
  var avgOf9 = 0;
  var avgOf17 = 0;
  if (pindexLast)
    blocktime = pindexLast.time;
  else blocktime = 0;

  for (blockoffset = 0; blockoffset < 17; blockoffset++)
  {
    oldblocktime = blocktime;
    if (pindexLast)
    {
      pindexLast = pindexLast._prev();
      blocktime = pindexLast.time;
    }
    else
    { // genesis block or previous
    blocktime -= this.target_avg_between_blocks;
    }
    // for each block, add interval.
    if (blockoffset < 5) avgOf5 += (oldblocktime - blocktime);
    if (blockoffset < 7) avgOf7 += (oldblocktime - blocktime);
    if (blockoffset < 9) avgOf9 += (oldblocktime - blocktime);
    avgOf17 += (oldblocktime - blocktime);    
  }
  // now we have the sums of the block intervals. Division gets us the averages. 
  avgOf5 /= 5;
  avgOf7 /= 7;
  avgOf9 /= 9;
  avgOf17 /= 17;
  return [avgOf5, avgOf7, avgOf9, avgOf17];
}

btc.Blockchain.Block.prototype.difficulty_adjustment_period = 1;
btc.Blockchain.Block.prototype.difficultyAdjustment = function() {
    var difficultyfactor = 10000;

    var nFastInterval = (this.target_avg_between_blocks * 9 ) / 10; // seconds per block desired when far behind schedule
    var nSlowInterval = (this.target_avg_between_blocks * 11) / 10; // seconds per block desired when far ahead of schedule
    var nIntervalDesired;

    var nAdjustmentInterval = 7 * 24 * 60 * 60;

    var pindexLast = this._prev();
    if (!pindexLast)
        // Genesis Block
        return this.proof_of_work_limit;

    // Regulate block times so as to remain synchronized in the long run with the actual time.  The first step is to
    // calculate what interval we want to use as our regulatory goal.  It depends on how far ahead of (or behind)
    // schedule we are.  If we're more than an adjustment period ahead or behind, we use the maximum (nSlowInterval) or minimum
    // (nFastInterval) values; otherwise we calculate a weighted average somewhere in between them.  The closer we are
    // to being exactly on schedule the closer our selected interval will be to our nominal interval (TargetSpacing).

    var now = pindexLast.time;
    var BlockHeightTime = btc.Blockchain.GenesisBlock.time + pindexLast.h * this.target_avg_between_blocks;

    if (midasDisableCalendarSync)
	nIntervalDesired = this.target_avg_between_blocks;
    else {
        if (now < BlockHeightTime + nAdjustmentInterval && now > BlockHeightTime )
        // ahead of schedule by less than one interval.
        nIntervalDesired = ((nAdjustmentInterval - (now - BlockHeightTime)) * this.target_avg_between_blocks +  
                    (now - BlockHeightTime) * nFastInterval) / nAdjustmentInterval;
        else if (now + nAdjustmentInterval > BlockHeightTime && now < BlockHeightTime)
        // behind schedule by less than one interval.
        nIntervalDesired = ((nAdjustmentInterval - (BlockHeightTime - now)) * this.target_avg_between_blocks + 
                    (BlockHeightTime - now) * nSlowInterval) / nAdjustmentInterval;

        // ahead by more than one interval;
        else if (now < BlockHeightTime) nIntervalDesired = nSlowInterval;
    
        // behind by more than an interval. 
        else  nIntervalDesired = nFastInterval;
    }

    // find out what average intervals over last 5, 7, 9, and 17 blocks have been. 
    var avgs = avgRecentTimestamps(pindexLast);
    var avgOf5 = avgs[0];
    var avgOf9 = avgs[1];
    var avgOf7 = avgs[2];
    var avgOf17 = avgs[3];

    // check for emergency adjustments. These are to bring the diff up or down FAST when a burst miner or multipool
    // jumps on or off.  Once they kick in they can adjust difficulty very rapidly, and they can kick in very rapidly
    // after massive hash power jumps on or off.
    
    // Important note: This is a self-damping adjustment because 8/5 and 5/8 are closer to 1 than 3/2 and 2/3.  Do not
    // screw with the constants in a way that breaks this relationship.  Even though self-damping, it will usually
    // overshoot slightly. But normal adjustment will handle damping without getting back to emergency.
    var toofast = (nIntervalDesired * 2) / 3;
    var tooslow = (nIntervalDesired * 3) / 2;

    // both of these check the shortest interval to quickly stop when overshot.  Otherwise first is longer and second shorter.
    if (avgOf5 < toofast && avgOf9 < toofast && avgOf17 < toofast)
    {  //emergency adjustment, slow down (longer intervals because shorter blocks)
      console.log("GetNextWorkRequired EMERGENCY RETARGET");
      difficultyfactor *= 8;
      difficultyfactor /= 5;
    }
    else if (avgOf5 > tooslow && avgOf7 > tooslow && avgOf9 > tooslow)
    {  //emergency adjustment, speed up (shorter intervals because longer blocks)
      console.log("GetNextWorkRequired EMERGENCY RETARGET");
      difficultyfactor *= 5;
      difficultyfactor /= 8;
    }

    // If no emergency adjustment, check for normal adjustment. 
    else if (((avgOf5 > nIntervalDesired || avgOf7 > nIntervalDesired) && avgOf9 > nIntervalDesired && avgOf17 > nIntervalDesired) ||
         ((avgOf5 < nIntervalDesired || avgOf7 < nIntervalDesired) && avgOf9 < nIntervalDesired && avgOf17 < nIntervalDesired))
    { // At least 3 averages too high or at least 3 too low, including the two longest. This will be executed 3/16 of
      // the time on the basis of random variation, even if the settings are perfect. It regulates one-sixth of the way
      // to the calculated point.
      console.log("GetNextWorkRequired RETARGET");
      difficultyfactor *= (6 * nIntervalDesired);
      difficultyfactor /= avgOf17 + (5 * nIntervalDesired);
    }

    // limit to doubling or halving.  There are no conditions where this will make a difference unless there is an
    // unsuspected bug in the above code.
    if (difficultyfactor > 20000) difficultyfactor = 20000;
    if (difficultyfactor < 5000) difficultyfactor = 5000;

    var old = this.difficulty;

    if (difficultyfactor == 10000) // no adjustment. 
      return;

    this.difficulty *= difficultyfactor / 10000;

    if (this.difficulty < this.proof_of_work_limit) {
        this.difficulty = this.proof_of_work_limit;
    }

    console.log("Actual time " + now + ", Scheduled time for this block height = " + BlockHeightTime );
    console.log("Nominal block interval = " + this.target_avg_between_blocks + ", regulating on interval " +
          nIntervalDesired + " to get back to schedule.");
    console.log("Intervals of last 5/7/9/17 blocks = " +
          avgOf5 + " / " + avgOf7 + " / " + avgOf9 + " / " + avgOf17 + ".");
    console.log("Difficulty Before Adjustment: " + old);
    console.log("Difficulty After Adjustment:  " + this.difficulty);

    console.log("(h=" + this.h + ") difficulty adjustment " + (difficultyfactor / 10000) + "x")
};
			break;
	}
}
// Default
setDifficultyAlgorithm('Zcash');

client.use(peermgr)
client.use(btc)

var hashrate = 1;
var BlossomPoWTargetSpacingRatio = 2.0;
var BlossomEnabled = true;
var BlossomActive = false;

client.init(function() {
	var self = this;

	function toggle(b) {
		var BlossomActivationHeight = parseInt($("#blossomactivationheight").val());
		if (BlossomEnabled && b.h == BlossomActivationHeight) {
			BlossomActive = true;
			BlossomPoWTargetSpacingRatio = parseFloat($("#blossompowtargetspacingratio").val());
			self.log('<b>Blossom activated! ratio='+BlossomPoWTargetSpacingRatio+'</b>' );
		}
	};

	self.on("miner:success", function(from, b) {
		self.log("Height: " + b.h + ", difficulty: " + b.difficulty);
		b.time = self.now();
		b.transactions = self.mempool.getList();

		self.inventory.createObj("block", b)

		if (self.blockchain.chainstate.enter(b) != -1) {
			self.inventory.relay(b.id, true);
		}
		toggle(b);
		return false;
	}, this)

	var myHashrate = (hashrate / 2) * Math.random();
	hashrate -= myHashrate;
	this.mine(myHashrate);
})

net.add(100, client)

function getTimeWindow(start, size) {
	var timeWindow = []
	var cur = start;

	var last = -1;
	while (cur && timeWindow.length < size) {
		if (last >= 0) {
			var timeSince = (last - cur.time)/1000; // in seconds
			timeWindow.push(timeSince);
		}

		last = cur.time;
		cur = cur._prev();
	}
	return timeWindow;
}

function getAverage(timeWindow) {
	var average = 0;
	if (timeWindow.length > 0) {
		timeWindow.forEach(function(n) {
			average += n;
		})
		average /= timeWindow.length;
	}
	return average;
}

var graphData = [];
var checkpoint = -1;
var shortWindow = 10;
var longWindow = 100;
if (net.visualizer) {
	net.check(1000 * 1000, function() {
		var sw = parseInt($("#shortwindow").val());
		var lw = parseInt($("#longwindow").val());
		if (sw != shortWindow || lw != longWindow) {
			shortWindow = sw;
			longWindow = lw;
			graphData = [];
			checkpoint = -1;
		}

		var head = net.nodes[90].blockchain.chainstate.head;
		var cur = head;
		var timeWindow = getTimeWindow(cur, head.h - checkpoint + longWindow);

		var temp = [];
		cur = head;
		var last = -1;
		while (cur && cur.h >= checkpoint) {
			if (last >= 0) {
				var timeSince = (last - cur.time)/1000; // in seconds
				var avShort = getAverage(timeWindow.slice(head.h-cur.h, head.h-cur.h+shortWindow));
				var avLong = getAverage(timeWindow.slice(head.h-cur.h, head.h-cur.h+longWindow));
				temp.push([cur.h, cur.difficulty, avShort, avLong]);
			}

			last = cur.time;
			cur = cur._prev();
		}
		graphData = temp.concat(graphData);
		checkpoint = head.h;
		console.log("Data: " + graphData.length + ", checkpoint: " + checkpoint);

		net.visualizer.drawGraph(graphData);
		var arrTimeSince = [];

		var mapBucket = {};
		cur = net.nodes[90].blockchain.chainstate.head;

		last = -1;
		while (cur) {
			if (last >= 0) {
				arrTimeSince.push(last - cur.time)

				var timeSince = Math.floor(((last - cur.time)/1000) / 5); // buckets of 20 seconds

				if (!(timeSince in mapBucket)) {
					mapBucket[timeSince] = 0;
				}

				mapBucket[timeSince]++;
			}

			last = cur.time;
			cur = cur._prev();
		}

		var data = [];

		for (i in mapBucket) {
			data.push([i*20,mapBucket[i]])
		}

		net.visualizer.drawScatter(data);
	/*
		// calculate the average
		var mean = 0;
		arrTimeSince.forEach(function(n) {
			mean+=n;
		})
		mean /= arrTimeSince.length;

		// calculate variance
		var variance = 0;
		arrTimeSince.forEach(function(n) {
			variance += Math.pow((n - mean), 2);
		})
		variance /= arrTimeSince.length;

		// calculate stddev
		var stddev = Math.sqrt(variance);

		net.log("time between blocks: mean = " + (mean/1000).toFixed(2) + " seconds; stddev = " + (stddev/1000).toFixed(2) + ' seconds');
	*/
	})
}

net.run(Infinity)
