function Calculate02(Unit, Volt) {

    //แรงดัน 22-33 kV
    var ToAll = 0.00;
    var Rate = 3.9086;

    //แรงดันต่ำกว่า 22 kV
    var To150 = 0.00;
    var To400 = 0.00;
    var More400 = 0.00;

    var Rate150 = 3.2484;
    var Rate400 = 4.2218;
    var RateMore400 = 4.4217;

    var Service = 0.00; //=IF(C4=2,46.16,312.24)
    var FT_ = GetFT();

    if (Volt == "1") //แรงดัน 22-33 kV
    {
        Service = 312.24;

        //=ROUND(IF($C$4=1,C6*C10,0),2)
        ToAll = Round(Unit * Rate);
    } else if (Volt == "2") //แรงดันต่ำกว่า 22 kV
    {
        Service = 46.16;

        //=ROUND(IF(C4=2,IF($C$6<151,$C$6*C12, 150*C12),0),2)
        if (Unit < 151) {
            To150 = Unit * Rate150;
        } else {
            To150 = 150 * Rate150;
        }
        //=ROUND(IF(C4=2,IF($C$6<151,0,IF($C$6<401,(C$6-150)*C13,(250*C13))),0),2)
        if (Unit < 151) {
            To400 = 0;
        } else if (Unit < 401) {
            To400 = (Unit - 150) * Rate400;
        } else {
            To400 = 250 * Rate400;
        }

        //=ROUND(IF(C4=2,IF($C$6<401,0,($C$6-400)*C14),0),2)
        if (Unit < 401) {
            More400 = 0;
        } else {
            More400 = (Unit - 400) * RateMore400;
        }
    }

    //-------------- Calculate & Display Result --------------

    var Power = Round(ToAll) + Round(To150) + Round(To400) + Round(More400);
    var Base = Round(Power + Service);
    var FT = Round(Unit * (FT_ / 100)); //=ROUND($C$6*$C$7/100,2)
    var VAT = Round((Base + FT) * nowVAT); //=ROUND((D17+D19)*0.07,2)
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

function Calculate02_TOU(Volt, Peak, OffPeak, Holiday) {

    var RateOn = 0.0000;
    var RateOff = 0.0000;
    var Service = 0.00; //=IF(C4=2,(46.16),(312.24))
    var FT_ = GetFT();

    if (Volt == "1") //แรงดัน 22-33 kV
    {
        RateOn = 5.1135;
        RateOff = 2.6037;
        Service = 312.24;
    } else if (Volt == "2") //แรงดันต่ำกว่า 22 kV
    {
        RateOn = 5.7982;
        RateOff = 2.6369;
        Service = 46.16;
    }

    //=ROUND(IF(C4=2,(C6* C13) + (C7 * D13)+(C8*D13), (C6 * C12) + (C7 * D12)+(C8*D12)),2)
    var Power = Round((Peak * RateOn) + (OffPeak * RateOff) + (Holiday * RateOff));
    var Base = Round(Power + Service);
    var FT = Round((Peak + OffPeak + Holiday) * (FT_ / 100)); //=ROUND((C6+C7+C8)*C9/100,2)
    var VAT = Round((Base + FT) * nowVAT); //=ROUND((E16+E18)*0.07,2)
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
