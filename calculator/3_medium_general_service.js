
function Calculate03(Volt, HighestUnits, Unit, NeedReactive) {
    let NeedRate = 0.00;
    let Rate = 0.00;
    let Service = 312.24;
    let FT_ = GetFT();
    //console.log("Calculate03 FT:" + FT_);

    if (Volt == "1") {
        //Case: 69+ kV
        NeedRate = 175.7;
        Rate = 3.1097;
    } else if (Volt == "2") {
        //Case: 22-33 kV
        NeedRate = 196.26;
        Rate = 3.1471;
    }
    
    else if (Volt == "3") { 
        //Case: 22 kV
        NeedRate = 221.5;
        Rate = 3.1751;
    }

    let NeedPower = Round(HighestUnits * NeedRate);
    let Power = Round(Unit * Rate);
    let Kilovar = 0.00;

    if (Math.round(NeedReactive - (HighestUnits * 0.6197)) > 0)
        Kilovar = Math.round(NeedReactive - (HighestUnits * 0.6197));

    let PowerFactor = Round(Kilovar * 56.07);
    let Base = NeedPower + Power + PowerFactor + Service;
    let FT = Round(Unit * (FT_ / 100));
    let VAT = Round((Base + FT) * nowVAT);
    let Summary = Base + FT + VAT;

    $("#txtResultNeedPower").autoNumeric('set', NeedPower);
    $("#txtResultPower").autoNumeric('set', Power);
    $("#txtResultKilovar").autoNumeric('set', Kilovar);
    $("#txtResultPowerFactor").autoNumeric('set', PowerFactor);
    $("#txtResultService").autoNumeric('set', Service);
    $("#txtResultBase").autoNumeric('set', Base);
    $("#txtResultFT").autoNumeric('set', FT);
    $("#txtResultVat").autoNumeric('set', VAT);
    $("#txtResultSummary").autoNumeric('set', Summary);
}

function Calculate03_TOU(Volt, NeedOnPeak, NeedOffPeak, NeedHoliday, Peak, OffPeak, Holiday, NeedReactive) {

    var NeedRateOn = 0.00;
    var RateOn = 0.00;
    var RateOff = 0.00;
    var Service = 312.24;
    var FT_ = GetFT();

    if (Volt == "1") //แรงดันตั้งแต่ 69  kV ขึ้นไป
    {
        NeedRateOn = 74.14;
        RateOn = 4.1025;
        RateOff = 2.5849;
    } else if (Volt == "2") //แรงดัน 22-33 kV
    {
        NeedRateOn = 132.93;
        RateOn = 4.1839;
        RateOff = 2.6037;
    } else if (Volt == "3") //แรงดันต่ำกว่า 22 kV
    {
        NeedRateOn = 210.00;
        RateOn = 4.3297;
        RateOff = 2.6369;
    }

    //=ROUND(IF($C$4=3,C6*C18,IF($C$4=2,C6*C17,C6*C16)),2)
    var NeedPower = Round(NeedOnPeak * NeedRateOn);

    //=ROUND(IF($C$4=3,(C9* C23)+(C10*D23) + (C11*D23),IF($C$4=2,(C9*C22)+(C10* D22)+(C11*D22),(C9* C21)+(C10* D21)+(C11*D21))),2)
    var Power = Round((Peak * RateOn) + (OffPeak * RateOff) + (Holiday * RateOff));

    var Kilovar = 0.00;

    //=IF(ROUND(C12-(MAX(C6:C8)*0.6197),0)>0,ROUND(C12-(MAX(C6:C8)*0.6197),0),0)
    if (Math.round(NeedReactive - (Math.max(NeedOnPeak, NeedOffPeak, NeedHoliday) * 0.6197)) > 0)
        Kilovar = Math.round(NeedReactive - (Math.max(NeedOnPeak, NeedOffPeak, NeedHoliday) * 0.6197));

    //=ROUND(E26*56.07,2)
    var PowerFactor = Round(Kilovar * 56.07);

    var Base = NeedPower + Power + PowerFactor + Service;

    var FT = Round((Peak + OffPeak + Holiday) * (FT_ / 100)); //=ROUND((C9+C10+C11)*C13/100,2)
    var VAT = Round((Base + FT) * nowVAT); //=ROUND((E29+E31)*0.07,2)
    var Summary = Base + FT + VAT;

    $("#txtResultNeedPower").autoNumeric('set', NeedPower);
    $("#txtResultPower").autoNumeric('set', Power);
    $("#txtResultKilovar").autoNumeric('set', Kilovar);
    $("#txtResultPowerFactor").autoNumeric('set', PowerFactor);
    $("#txtResultService").autoNumeric('set', Service);
    $("#txtResultBase").autoNumeric('set', Base);
    $("#txtResultFT").autoNumeric('set', FT);
    $("#txtResultVat").autoNumeric('set', VAT);
    $("#txtResultSummary").autoNumeric('set', Summary);

    //Check if Discount 3% Valid
    Discount003Section(Summary);
}