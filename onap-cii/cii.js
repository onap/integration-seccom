"use strict";
console.clear();
var BASEURL = "https://bestpractices.coreinfrastructure.org/projects.json";
var Q = "onap";
var repoUrlPrefixes = [
		       "https://gerrit.onap.org/r/#/admin/projects/", 
		       "https://gerrit.onap.org/r/",
		       "https://git.onap.org/"
		       ];
var badRepoUrlPrefix = "https://gerrit.onap.org/r/".toUpperCase();
var goodRepoUrlPrefix = "https://gerrit.onap.org/r/#/admin/projects/";

var colors = [
	      /* 0-9    */ "#c4551d",
	      /* 10-19  */ "#ba4b13",
	      /* 20-29  */ "#c4611d",
	      /* 30-39  */ "#c46c1d",
	      /* 40-49  */ "#c47a1d",
	      /* 50-59  */ "#c4881d",
	      /* 60-69  */ "#b5890e",
	      /* 70-79  */ "#c4a41d",
	      /* 80-89  */ "#b7a910",
	      /* 90-99  */ "#c4011d",
	      /* 100    */ "#4bc51d"
	      ];
var silver = "#bbbbbb";
var gold   = "#f2ce0d";
var black  = "#000000";
var white  = "#ffffff";

function getColor(passingPercentage, silverPercentage, goldPercentage) {
    var color = colors[parseInt(passingPercentage / 10, 10)];
    if (passingPercentage == 100 && silverPercentage == 100) {
	if (goldPercentage == 100) { color = gold; }
	else { color = silver; }
    }
    return color;
}


var parms = new Query();
var debug = "y"; // parms.get("debug", "n");
function debuglog(msg, parm) {
    if (debug == "y") {
        if (typeof parm != 'undefined') console.log(msg, parm);
        else console.log(msg);
    } else if (debug == "alert") {
        if (typeof parm != 'undefined') alert(msg, parm);
        else alert(msg);
    }
}

var help = parms.get("help", "n");
if (help == 'y') {
  document.write("project=onap or all<br/>");
  document.write("page=1-2,5-6 (only valid for project=all)<br/>");
  document.write("addMissingOnapProjects=y or n<br/>");
  document.write("jsonformat=pretty<br/>");
  document.write("debug=y<br/>");
  throw 'help';
}

function sanitizeRelease(r, def) {
    // debuglog("sanitizeRelease(" + r + ")");
    if (r == "current") {
        // debuglog("found current");
        return r;
    }
    for (var k = 0; k < releases.length; k++) {
        var release = releases[k];
        if (r == release) {
            // debuglog("found the release");
            return r;
        }
    }
    debuglog("release not found, returning default: '" + def + "'");
    return def;
}

function titleCase(str) {
    if (str.length == 0) return str;
    return str.charAt(0).toUpperCase() + str.substring(1);
}

function intermingleReleasesAndBadgingLevels() {
    var headers = "";
    var badgingLevels = ["Passing", "Silver", "Gold"];
    for (var bl in badgingLevels) {
        for (var k in releases) {
            headers += "<th>" + titleCase(releases[k].short_name) + "<br/>%&nbsp;" + badgingLevels[bl] + "</th>";
        }
    }
    return headers;
}



function addReleasesAndBadgingLevelsToTable() {
    var headers = intermingleReleasesAndBadgingLevels();
    //    $('#tr').append("<thead><tr>" +
    //		    "<th>RankOrder</th>" +
    //		    "<th>Project/Repo Name</th>" +
    //		    "<th>Project Name</th>" +
    //		    "<th>Badge</th>" +
    //		    headers +
    //		    "</tr></thead>" +
    //		    "<tfoot><tr>" +
    //		    "<th>RankOrder</th>" +
    //		    "<th>Project/Repo Name</th>" +
    //		    "<th>Project Name</th>" +
    //		    "<th>Badge</th>" +
    //		    headers +
    //		    "</tr></tfoot>");
    $('#tr').append("<thead><tr>" +
		    "<th>RankOrder</th>" +
		    "<th>Prefix</th>" +
		    "<th>Name</th>" +
		    "<th>Badge</th>" +
		    "<th>%0</th>" +
		    "<th>%1</th>" +
		    "<th>%2</th>" +
		    "</tr></thead>");
}

// store the current data into data[]
function pushData(whereTo, whereFrom) {
    $(whereFrom).each(function(index, element) {
        whereTo.push(element);
    });
}

function genPageList(page) {
    var pagelist = [];
    var pageRanges = page.split(",");
    for (var i = 0; i < pageRanges.length; i++) {
	var pos = pageRanges[i].indexOf('-');
	var start = pageRanges[i];
	var end = start;
	if (pos > 0) {
	    start = pageRanges[i].substring(0, pos);
	    end = pageRanges[i].substring(pos+1);
	}
	// debuglog("start=" + start + ", end=" + end);
	for (var j = Number(start); j < Number(end)+1; j++) {
	    pagelist.push(j);
	}
    }
    return pagelist;
}

function generateRank(element) {
    return element.badge_percentage_0 * 1000000 + element.badge_percentage_1 * 1000 + element.badge_percentage_2;
}

// "repo_url": "https://gerrit.onap.org",    <- bad
// "repo_url": "https://gerrit.onap.org/r/#/admin/projects", <- bad
// "repo_url": "https://gerrit.onap.org/r/#/admin/projects/aai/esr-server",
// "repo_url": "https://gerrit.onap.org/r/#/admin/projects/aai/sparky-fe",
// "repo_url": "https://gerrit.onap.org/r/#/admin/projects/appc",
// "repo_url": "https://gerrit.onap.org/r/#/admin/projects/ccsdk",
// "repo_url": "https://gerrit.onap.org/r/#/admin/projects/clamp",
// "repo_url": "https://gerrit.onap.org/r/#/admin/projects/cli",
// "repo_url": "https://gerrit.onap.org/r/#/admin/projects/policy",
// "repo_url": "https://gerrit.onap.org/r/#/admin/projects/portal",
// "repo_url": "https://gerrit.onap.org/r/#/admin/projects/sdnc",
// "repo_url": "https://gerrit.onap.org/r/#/admin/projects/vnfsdk",
// "repo_url": "https://gerrit.onap.org/r/msb",
// "repo_url": "https://gerrit.onap.org/r/sdc",
// "repo_url": "https://gerrit.onap.org/r/so",
// "repo_url": "https://gerrit.onap.org/r/vfc",
// "repo_url": "https://gerrit.onap.org/r/vid",
// "repo_url": "https://git.onap.org/holmes",


/*
  From a list of Repo URLs, generate an array with the project name as the first element
  and the Repo names as the remaining elements.
*/
var badUrlCount = 0;
function determineProjectAndRepoNames(urlList) {
    var urls = urlList.split(/[\s,]+/);
    // console.log("urls=" + urls);
    var repos = ["UNKNOWN"];
    
    for (var u in urls) {
	var url = urls[u];
	// console.log("looking at url=" + url);
	var urlUpper = url.toUpperCase();
	// console.log("urlUpper=" + urlUpper);
	var repo = "UNKNOWN-BADURL";
	for (var up in repoUrlPrefixes) {
	    var urlPrefix = repoUrlPrefixes[up];
	    // console.log("looking at urlPrefix=" + urlPrefix);
	    var lenPrefix = urlPrefix.length;
	    // console.log("lenPrefix=" + lenPrefix);
	    var urlPrefixUpper = urlPrefix.toUpperCase();
	    var urlUpperStart = urlUpper.substring(0, lenPrefix);
	    // console.log("comparing " + urlPrefixUpper + " with " + urlUpperStart);
	    if (urlPrefixUpper == urlUpperStart) {
		repo = url.substring(lenPrefix).toLowerCase();
		if (urlPrefixUpper == badRepoUrlPrefix) {
		    repo = repo + "-BADURL";
		}
		break;
	    }
	}
	repos.push(repo);
    }

    // Figure out the project name from the first repo in the list.
    // "abc/def" => "abc". "wxy" => "wxy".
    var n = repos[1].indexOf("/");
    if (n == -1) {
	repos[0] = repos[1];
    } else {
	repos[0] = repos[1].substring(0, n);
    }
    if (repos[0] == '#') repos[0] = "UNKNOWN-BADURL";
    if (repos[0].endsWith("-BADURL")) {
	repos[0] = repos[0] + badUrlCount;
	badUrlCount++;
    }

    return repos;
}

// store the current data into data[]
function pushData(whereTo, whereFrom) {
    $(whereFrom).each(function(index, element) {
        whereTo.push(element);
    });
}

function getNextUrl(datad, pagelist, j) {
    var lastOne = j == pagelist.length-1;
    var p = pagelist[j];
    URL = BASEURL;
    $('#watermarkPage').html("page " + p);

    $.ajax({
	    type: "GET",
		url: URL,
		data: { "q": Q, "page": p },
		success: function(json) {
		// if (typeof json == "string") pushData(historicalReleaseData[currentRelease], JSON.parse(json));
		// else pushData(historicalReleaseData[currentRelease], json);
		if (typeof json == "string") pushData(datad, JSON.parse(json));
		else pushData(datad, json);
		// debuglog("got pagelist[" + j + "]=" + p + ", lastOne=" + lastOne);
		if (json == '') whenDone(datad);
		else if (lastOne) whenDone(datad);
		else getNextUrl(datad, pagelist, j+1);
	    },
		error: function(request,error, thrownError) {
		alert("Request: "+JSON.stringify(request) + "\n" + "error=" + error + "\n" + "thrownError=" + thrownError);
	    }
	});
}

function addRankOrder(d) {
    d.sort(function(a,b) { return b.onap_rank - a.onap_rank; });
    var prev = -1;
    var iprev = -1;
    for (var i = 0; i < d.length; i++) {
	if (d[i].onap_rank == prev) {
	    d[i].onap_rank_order = iprev + 1;
	} else {
	    d[i].onap_rank_order = i + 1;
	    prev = d[i].onap_rank;
	    iprev = i;
	}
    }
}


function getAllNames(data, type, row) {
    if (type !== 'display') return data;
    if (row.id == -1) return data;
    var urlPrefix = '<a href="https://bestpractices.coreinfrastructure.org/projects/';
    var urlSuffix = '">';
    var anchorEnd = '</a>';
    var ret = urlPrefix + row.id + urlSuffix + row.name + anchorEnd;
    if (row.hasOwnProperty('otherRepos') && row.otherRepos.length > 0) {
	for (var k in row.otherRepos) {
	    var otherRepo = row.otherRepos[k];
	    ret += "<br/>";
	    ret += urlPrefix + otherRepo.id + urlSuffix + otherRepo.name + anchorEnd;
	}
    }
    return ret;
}

function getAllBadges(data, type, row) {
    if (type !== 'display') return data;
    if (row.id == -1) return '<img src="img/cii-not-started.png"/>';
    var urlPrefix = '<img src="https://bestpractices.coreinfrastructure.org/projects/';
    var urlSuffix = '/badge"/>';
    var ret = urlPrefix + row.id + urlSuffix;
    if (row.hasOwnProperty('otherRepos') && row.otherRepos.length > 0) {
	for (var k in row.otherRepos) {
	    var otherRepo = row.otherRepos[k];
	    ret += "<br/>";
	    ret += urlPrefix + otherRepo.id + urlSuffix;
	}
    }
    return ret;
}

function getAllPercentages(data, type, row, num) {
    if (type !== 'display') return data;
    var ret = row["badge_percentage_"+num];
    if (row.hasOwnProperty('otherRepos') && row.otherRepos.length > 0) {
	for (var k in row.otherRepos) {
	    var otherRepo = row.otherRepos[k];
	    ret += "<br/>";
	    ret += otherRepo["badge_percentage_"+num];
	}
    }
    return ret;
}


function whenDone(datad) {
    addReleasesAndBadgingLevelsToTable();
    for (var k in datad) {
	var projectAndRepos = determineProjectAndRepoNames(datad[k].repo_url);
	datad[k].onap_project = projectAndRepos[0];
	datad[k].onap_repos = projectAndRepos.shift();
    }
    datad.sort(function(a, b) {
	    var ap = a.onap_project.toUpperCase();
	    var bp = b.onap_project.toUpperCase();
	    return ap > bp ? 1 : bp > ap ? -1 : 0;
	});

    var dataTable = [ ];

    // Move the additional repo information for a project into an element called otherRepos.
    // At the end of this, all data is in dataTable instead of datad.
    var prevProject = "";
    for (var k in datad) {
	if (datad[k].onap_project == prevProject) {
	    dataTable[dataTable.length-1].otherRepos.push(datad[k]);
	} else {
	    datad[k].otherRepos = [];
	    dataTable.push(datad[k])
	}
	prevProject = datad[k].onap_project;
    }
    // For each element in dataTable:
    //   1) add the onap_badge element
    //   2) add the onap_rank, based on the badge percentages
    //   3) TODO: if there is more than one repo involved, set a composite score to the lowest of the repos.
    $(dataTable).each(function(index, element) {
	    element.onap_badge = element.id;
	    element.onap_rank = element.badge_percentage_0 * 1000000 + element.badge_percentage_1 * 1000 + element.badge_percentage_2;
	    if (allOnapProjects[currentRelease].hasOwnProperty(element.onap_project))
		allOnapProjects[currentRelease][element.onap_project].seen = "y";
	});

    for (var project in allOnapProjects[currentRelease]) {
	var element = allOnapProjects[currentRelease][project];
	if (element.seen == "n") {
	    console.log("unseen project=" + project);
	    dataTable.push({
		    "repo_url": goodRepoUrlPrefix + project,
			"onap_project": project,
			"name": project, 
			"id": -1,
			"onap_badge": -1,
			"onap_rank": 0,
			"badge_percentage_0": 0,
			"badge_percentage_1": 0,
			"badge_percentage_2": 0 
			});

	}
    }
		

    // now that we have a ranking, add the rank order
    addRankOrder(dataTable);

    // console.log("dataTable=",dataTable);
    var datatableButtons = [ "pageLength" ];

    $('#tr').DataTable({
	    "data": dataTable,
		"paging": true,
		"pagingType": "full_numbers",
		"pageLength": 20,
		"info": false,
		"dom": "Bfrtip",
		lengthMenu: [
			     [ 10, 20, 25, 50, 100, -1 ],
			     [ '10 rows', '20 rows', '25 rows', '50 rows', '100 rows', 'Show all' ]
			     ],
		"searching": true,
		"autoWidth": false,
		"buttons": datatableButtons,
		"columns": [
			    { "data": "onap_rank_order", className: "textright" },
			    { "data": "onap_project" },
			    { "data": "name", "render": function ( data, type, row, meta ) { return getAllNames(data, type, row); } },
			    { "data": "onap_badge", "render": function ( data, type, row, meta ) { return getAllBadges(data, type, row); } },
			    { "data": "badge_percentage_0", "render": function ( data, type, row, meta ) { return getAllPercentages(data, type, row,"0"); } },
			    { "data": "badge_percentage_1", "render": function ( data, type, row, meta ) { return getAllPercentages(data, type, row,"1"); } },
			    { "data": "badge_percentage_2", "render": function ( data, type, row, meta ) { return getAllPercentages(data, type, row,"2"); } },
			    ]
		});

    $('#watermark').hide();

    var passingCount = 0; var silverCount = 0; var goldCount = 0;
    var nonPassingCount = 0; var nonSilverCount = 0; var nonGoldCount = 0;
    var passing80Count = 0; var silver80Count = 0; var gold80Count = 0;
    var totalCount = dataTable.length;

    $(dataTable).each(function(index, element) {
	    if (element.badge_percentage_0 == 100) passingCount++;
	    else { nonPassingCount++; if (element.badge_percentage_0 >= 80) { passing80Count++; } }
	    if (element.badge_percentage_1 == 100) silverCount++;
	    else { nonSilverCount++; if ((element.badge_percentage_0 == 100) && (element.badge_percentage_1 >= 80)) { silver80Count++; } }
	    if (element.badge_percentage_2 == 100) goldCount++;
	    else { nonGoldCount++; if ((element.badge_percentage_1 == 100) && (element.badge_percentage_2 >= 80)) { gold80Count++; } }
	});

    var passing80Percentage = (nonPassingCount > 0) ? (100 * passing80Count / nonPassingCount) : 0;
    var silver80Percentage = (nonSilverCount > 0) ? (100 * silver80Count / nonSilverCount) : 0;
    var gold80Percentage = (nonGoldCount > 0) ? (100 * gold80Count / nonGoldCount) : 0;

    $('#tr2').append(
		     "<tr>" +
		     "<th>Projects &ge;80%/&lt;100%</th>" +
		     "<td class='textright'>" + passing80Count.toFixed(2) + "&nbsp;/&nbsp;" + nonPassingCount.toFixed(2) + "&nbsp;=&nbsp;" + passing80Percentage.toFixed(2) + "%</td>" +
		     "<td class='textright'>" + silver80Count.toFixed(2) + "&nbsp;/&nbsp;" + nonSilverCount.toFixed(2) + "&nbsp;=&nbsp;" + silver80Percentage.toFixed(2) + "%</td>" +
		     "<td class='textright'>" + gold80Count.toFixed(2) + "&nbsp;/&nbsp;" + nonGoldCount.toFixed(2) + "&nbsp;=&nbsp;" + gold80Percentage.toFixed(2) + "%</td>" +
		     "</tr>"
		     );

    var passingPercentage = (100 * passingCount / totalCount);
    var silverPercentage = (100 * silverCount / totalCount);
    var goldPercentage = (100 * goldCount / totalCount);

    $('#tr2').append(
		     "<tr>" +
		     "<th>Projects at 100%</th>" +
		     "<td class='textright'>" + passingCount.toFixed(2) + "&nbsp;/&nbsp;" + totalCount.toFixed(2) + "&nbsp;=&nbsp;" + passingPercentage.toFixed(2) + "%</td>" +
		     "<td class='textright'>" + silverCount.toFixed(2) + "&nbsp;/&nbsp;" + totalCount.toFixed(2) + "&nbsp;=&nbsp;" + silverPercentage.toFixed(2) + "%</td>" +
		     "<td class='textright'>" + goldCount.toFixed(2) + "&nbsp;/&nbsp;" + totalCount.toFixed(2) + "&nbsp;=&nbsp;" + goldPercentage.toFixed(2) + "%</td>" +
		     "</tr>"
		     );

    var color = getColor(passingPercentage, silverPercentage, goldPercentage);
    var textcolor = (color == gold) ? black : (color == silver) ? black : white;

    var level = "Level 0";
    if ((passingPercentage >= 70) && ((nonPassingCount == 0) || (passing80Percentage >= 80))) { level = "Level 1"; }
    if ((silverPercentage >= 70) && ((nonSilverCount == 0) || (silver80Percentage >= 80))) { level = "Level 2"; }
    if ((goldPercentage >= 70) && ((nonGoldCount == 0) || (gold80Percentage >= 80))) { level = "Level 3"; }
    if (goldPercentage == 100) { level = "Level 4"; }

    $('#tr2').append(
		     "<tr>" +
		     "<td class='center' colspan='4' style='color: " + textcolor + "; background-color: " + color + "'><br/>" + totalCount + " Projects: " + level + "<br/><br/></td>" +
		     "</tr>"
		     );


}


$(document).ready(function() {
	var pagelist = genPageList(parms.get("page", '1-9'));
	var datad = [];
	getNextUrl(datad, pagelist, 0);
	
}); // end of document.ready()
