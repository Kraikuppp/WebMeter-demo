function Calculate04(Volt, NeedOnPeak, NeedPartialPeak, NeedOffPeak, Unit, NeedReactive) {

    var NeedRateOn = 0.00
    var NeedRatePartial = 0.00;
    var NeedRateOff = 0.00;
    var RateOn = 0.00;
    var Service = 312.24;
    var FT_ = GetFT();

    if (Volt == "1") //แรงดันตั้งแต่ 69  kV ขึ้นไป
    {
        NeedRateOn = 224.3;
        NeedRatePartial = 29.91;
        NeedRateOff = 0.00;
        RateOn = 3.1097;
    } else if (Volt == "2") //แรงดัน 22-33 kV
    {
        NeedRateOn = 285.05;
        NeedRatePartial = 58.88;
        NeedRateOff = 0.00;
        RateOn = 3.1471;
    } else if (Volt == "3") //แรงดันต่ำกว่า 22 kV
    {
        NeedRateOn = 332.71;
        NeedRatePartial = 68.22;
        NeedRateOff = 0.00;
        RateOn = 3.1751;
    }

    //=IF(C4=3,ROUND((C6*C16),2)+ROUND(((C7-C6)*D16),2),IF(C4=2,ROUND((C6*C15),0)+ROUND(((C7-C6)*D15),2),IF(C4=1,ROUND((C6*C14),2)+ROUND(((C7-C6)*D14),2))))
    var NeedPower = Round(NeedOnPeak * NeedRateOn) + Round((NeedPartialPeak - NeedOnPeak) * NeedRatePartial);

    //=ROUND(IF(C4=3,C9*C21,IF(C4=2,C9*C20,C9*C19)),2)
    var Power = Round(Unit * RateOn);

    var Kilovar = 0.00;

    //=IF(ROUND(C10-(MAX(C6:C8)*0.6197),0)>0,ROUND(C10-(MAX(C6:C8)*0.6197),0),0)
    if (Math.round(NeedReactive - (Math.max(NeedOnPeak, NeedPartialPeak, NeedOffPeak) * 0.6197)) > 0)
        Kilovar = Math.round(NeedReactive - (Math.max(NeedOnPeak, NeedPartialPeak, NeedOffPeak) * 0.6197));

    //=ROUND(F24*56.07,2)
    var PowerFactor = Round(Kilovar * 56.07);

    var Base = NeedPower + Power + PowerFactor + Service;

    var FT = Round(Unit * (FT_ / 100)); //=ROUND($C$9*$C$11/100,2)
    var VAT = Round((Base + FT) * nowVAT); //=ROUND((F27+F29)*0.07,2)
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

function Calculate04_TOU(Volt, NeedOnPeak, NeedOffPeak, NeedHoliday, Peak, OffPeak, Holiday, NeedReactive) {

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

    //=ROUND(IF(C4=3,C6*C18,IF(C4=2,C6*C17,C6*C16)),2)
    var NeedPower = Round(NeedOnPeak * NeedRateOn);

    //=ROUND(IF(C4=3,(C9* C23)+((C10+C11)*D23),IF(C4=2,(C9*C22)+((C10+C11)* D22),(C9* C21)+((C10+C11)* D21))),2)
    var Power = Round((Peak * RateOn) + ((OffPeak + Holiday) * RateOff));

    var Kilovar = 0.00;

    //=IF(ROUND(C12-(MAX(C6:C8)*0.6197),0)>0,ROUND(C12-(MAX(C6:C8)*0.6197),0),0)
    if (Math.round(NeedReactive - (Math.max(NeedOnPeak, NeedOffPeak, NeedHoliday) * 0.6197)) > 0)
        Kilovar = Math.round(NeedReactive - (Math.max(NeedOnPeak, NeedOffPeak, NeedHoliday) * 0.6197));

    //=ROUND(E26*56.07,2)
    var PowerFactor = Round(Kilovar * 56.07);

    var Base = NeedPower + Power + PowerFactor + Service;

    var FT = Round((Peak + OffPeak + Holiday) * (FT_ / 100)); //=ROUND(C13*SUM(C9:C11)/100,2)
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
