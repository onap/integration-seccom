class Query {
    constructor() {
        var query = window.location.search.substring(1);
        this.parms = query.split('&');
    };

    get(nm, def) {
        if (def == null) def = "";
        for (var i = 0; i < this.parms.length; i++) { 
            var pos = this.parms[i].indexOf('=');
            if ((pos > 0) && (nm == this.parms[i].substring(0, pos))) {
                var val = decodeURIComponent(this.parms[i].substring(pos + 1).replace("+"," "));
                return val;
            }
        }
        return def;
    } 

    getAll(nm, def) {
        var retA = [];
        var foundOne = false;
        for (var i = 0; i < this.parms.length; i++) { 
            var pos = this.parms[i].indexOf('=');
            if ((pos > 0) && (nm == this.parms[i].substring(0, pos))) {
                var val = decodeURIComponent(this.parms[i].substring(pos + 1).replace("+"," "));
                retA.append(val);
                foundOne = true;
            }
        }
	if (foundOne) {
            return retA;
        } else {
            return def;
        }
    } 

    setParm(nm, def) {
        this.parms.push(nm + "=" + def);
    }
}
