function Calculate06(Unit, Volt) {

    // แรงดัน 69 kVขึ้นไป
    var Value1 = 0.00;
    var Rate1 = 3.4149;

    //แรงดัน 22-33 kV
    var Value2 = 0.00;
    var Rate2 = 3.5849;

    //แรงดันต่ำกว่า 22 kV
    var To10 = 0.00;
    var More10 = 0.00;

    var Rate10 = 2.8013;
    var RateMore10 = 3.8919;

    var Service = 0.00; //=IF(C5=3,(20),(312.24))
    var FT_ = GetFT();

    if (Volt == "1") // แรงดัน 69 kVขึ้นไป
    {
        Service = 312.24;

        //=ROUND(IF($C$5=1,C7*C11,0),2)
        Value1 = Round(Unit * Rate1);
    } else if (Volt == "2") //แรงดัน 22-33 kV
    {
        Service = 312.24;

        //=ROUND(IF($C$5=2,C7*C12,0),2)
        Value2 = Round(Unit * Rate2);
    } else if (Volt == "3") //แรงดันต่ำกว่า 22 kV
    {
        Service = 20;

        //=IF(C5=3,IF($C$7<11,$C$7*C14, 10*C14),0)
        if (Unit < 11) {
            To10 = Unit * Rate10;
        } else {
            To10 = 10 * Rate10;
        }
        //=IF(C5=3,IF($C$7<11,0,($C$7-10)*C15),0)
        if (Unit < 11) {
            More10 = 0;
        } else {
            More10 = (Unit - 10) * RateMore10;
        }
    }

    //-------------- Calculate & Display Result --------------

    var Power = Round(Value1) + Round(Value2) + Round(To10) + Round(More10);
    var Base = Round(Power + Service);
    var FT = Round(Unit * (FT_ / 100)); //=ROUND($C$7*$C$8/100,2)
    var VAT = Round((Base + FT) * nowVAT); //=ROUND((E18+E20)*0.07,2)
    var Summary = Base + FT + VAT;

    $("#txtResultPower").autoNumeric('set', Power);
    $("#txtResultService").autoNumeric('set', Service);
    $("#txtResultBase").autoNumeric('set', Base);
    $("#txtResultFT").autoNumeric('set', FT);
    $("#txtResultVat").autoNumeric('set', VAT);
    $("#txtResultSummary").autoNumeric('set', Summary);

    //Check if Discount 3% Valid
    Discount003Section(Summary);
}

function Calculate06_TOU(Volt, NeedOnPeak, NeedOffPeak, NeedHoliday, Peak, OffPeak, Holiday, NeedReactive) {

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

    //=IF(ROUND(C12-(MAX(C6:C7)*0.6197),0)>0,ROUND(C12-(MAX(C6:C7)*0.6197),0),0)
    if (Math.round(NeedReactive - (Math.max(NeedOnPeak, NeedOffPeak) * 0.6197)) > 0)
        Kilovar = Math.round(NeedReactive - (Math.max(NeedOnPeak, NeedOffPeak) * 0.6197));

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
