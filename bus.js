class Bus {
    busNumber;
    plateNumber;
    ETA;
    constructor(options) {
        this.busNumber = options.vehId1._text
        this.plateNumber = options.plainNo1._text
        this.ETA = Number(options.expCf1._text)
    }
}