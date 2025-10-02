function Calculate01(Unit) {
  let Rate_FT = GetFT();
  let TotalEnergy_Charge = 0.0;
  let FT_Charge = 0.0;
  let VAT_Charge = 0.0;
  let TotalElectricityCharge = 0.0;
  let CustomerType = $("#ddlCustomerType").val();

  if (Unit > 0) {
    if (CustomerType == 111) {
      let Baht_Max15 = 0.0;
      let Baht_Max25 = 0.0;
      let Baht_Max35 = 0.0;
      let Baht_Max100 = 0.0;
      let Baht_Max150 = 0.0;
      let Baht_Max400 = 0.0;
      let Baht_Min401 = 0.0;
      let Rate_Max15 = 2.3488;
      let Rate_Max25 = 2.9882;
      let Rate_Max35 = 3.2405;
      let Rate_Max100 = 3.6237;
      let Rate_Max150 = 3.7171;
      let Rate_Max400 = 4.2218;
      let Rate_Min401 = 4.4217;
      let Service_Charge = 8.19;

      if (Unit < 15) Baht_Max15 = Unit * Rate_Max15;
      else Baht_Max15 = 15 * Rate_Max15;

      if (Unit < 25) Baht_Max25 = GetPositive((Unit - 15) * Rate_Max25);
      else Baht_Max25 = 10 * Rate_Max25;

      if (Unit < 35) Baht_Max35 = GetPositive((Unit - 25) * Rate_Max35);
      else Baht_Max35 = 10 * Rate_Max35;

      if (Unit < 100) Baht_Max100 = GetPositive((Unit - 35) * Rate_Max100);
      else Baht_Max100 = 65 * Rate_Max100;

      if (Unit < 150) Baht_Max150 = GetPositive((Unit - 100) * Rate_Max150);
      else Baht_Max150 = 50 * Rate_Max150;

      if (Unit < 400) Baht_Max400 = GetPositive((Unit - 150) * Rate_Max400);
      else Baht_Max400 = 250 * Rate_Max400;

      if (Unit > 400) Baht_Min401 = GetPositive((Unit - 400) * Rate_Min401);

      TotalEnergy_Charge = Round(Baht_Max15) + Round(Baht_Max25) + Round(Baht_Max35) + Round(Baht_Max100) + Round(Baht_Max150) + Round(Baht_Max400) + Round(Baht_Min401);
      TotalBaseTariff_Charge = Round(TotalEnergy_Charge + Service_Charge);
      FT_Charge = Round(Unit * (Rate_FT / 100));
      VAT_Charge = Round((TotalBaseTariff_Charge + FT_Charge) * nowVAT);
      TotalElectricityCharge = TotalBaseTariff_Charge + FT_Charge + VAT_Charge;

      $("#electricity-bill-panel").css("display", "");
      $("#electricity-bill-panel-150").css("display", "none");
      $("#txtResultPower").autoNumeric("set", TotalEnergy_Charge);
      $("#txtResultService").autoNumeric("set", Service_Charge);
      $("#txtResultBase").autoNumeric("set", TotalBaseTariff_Charge);
      $("#txtResultFT").autoNumeric("set", FT_Charge);
      $("#txtResultVat").autoNumeric("set", VAT_Charge);
      $("#txtResultSummary").autoNumeric("set", TotalElectricityCharge);

    } else if (CustomerType == 112) {

      $("#electricity-bill-panel").css("display", "none");
      $("#electricity-bill-panel-150").css("display", "");

      let Baht_Max150 = 0.0;
      let Baht_Max400 = 0.0;
      let Baht_Min401 = 0.0;
      let Rate_Max150 = 3.2484;
      let Rate_Max400 = 4.2218;
      let Rate_Min401 = 4.4217;
      let Service_Charge = 38.22;
      let year = $("#ddlYear").val();
      if (year > 2565) Service_Charge =  24.62;

      //Unit 1-150 | ROUND(IF($C$4<151,$C$4*C8, 150*C8),2)
      if (Unit < 150)
        Baht_Max150 = Unit * Rate_Max150;
      else
        Baht_Max150 = 150 * Rate_Max150;

      //Unit 151-400 | ROUND(IF($C$4<151,0,IF($C$4<401,(C$4-150)*C9,(250*C9))),2)
      if (Unit < 401)
        Baht_Max400 = GetPositive((Unit - 150) * Rate_Max400);
      else
        Baht_Max400 = 250 * Rate_Max400;

      if (Unit > 400) //Unit 401++ | ROUND(IF($C$4<401,0,($C$4-400)*C10),2)
        Baht_Min401 = GetPositive((Unit - 400) * Rate_Min401);

      TotalEnergy_Charge = Round(Baht_Max150) + Round(Baht_Max400) + Round(Baht_Min401);
      TotalBaseTariff_Charge = Round(TotalEnergy_Charge + Service_Charge);
      FT_Charge = Round(Unit * (Rate_FT / 100)); // ROUND(C4*(C5/100),2)
      VAT_Charge = Round((TotalBaseTariff_Charge + FT_Charge) * nowVAT); //ROUND((D17+D19)*0.07,2)
      TotalElectricityCharge = TotalBaseTariff_Charge + FT_Charge + VAT_Charge;

      $("#txtResultPower150").autoNumeric("set", TotalEnergy_Charge);
      $("#txtResultService150").autoNumeric("set", Service_Charge);
      $("#txtResultBase150").autoNumeric("set", TotalBaseTariff_Charge);
      $("#txtResultFT150").autoNumeric("set", FT_Charge);
      $("#txtResultVat150").autoNumeric("set", VAT_Charge);
      $("#txtResultSummary150").autoNumeric("set", TotalElectricityCharge);

      if (IsDiscount_3Percent()) {
        $(".covid-19").css("display", "");
        var Discount_3Percent = TotalElectricityCharge * 0.03;
        var AfterDiscount_3Percent = TotalElectricityCharge - Discount_3Percent;
        $("#pnlDiscount150").css("display", "");
        $("#txtDiscount150").autoNumeric("set", Discount_3Percent);
        $("#txtAfterDiscount150").autoNumeric("set", AfterDiscount_3Percent);
      } else {
        $("#pnlDiscount150").css("display", "none");
      }
    }

    $("#divResultPower").css("display", "");
  }
}

function IsBaseCheaper() {
  const FT_Now = GetFT();
  const Volt = $("#ddlVolt").val();
  const Peak = parseInt($("#txtPeak").autoNumeric("get"));
  const OffPeak = parseInt($("#txtOffPeak").autoNumeric("get"));
  const Holiday = parseInt($("#txtHoliday").autoNumeric("get"));
  const _Peak = parseInt($("#txtDiscount_Peak").autoNumeric("get"));
  const _OffPeak = parseInt($("#txtDiscount_OffPeak").autoNumeric("get"));
  const _Holiday = parseInt($("#txtDiscount_Holiday").autoNumeric("get"));

  let RateOn = 0.0;
  let RateOff = 0.0;
  let Service = 0.0;

  // Volt 1 : แรงดัน 22-33 kV || Volt 2 : แรงดันต่ำกว่า 22 kV
  if (Volt == "1") {
    RateOn = 5.1135;
    RateOff = 2.6037;
    Service = 312.24;
  } else if (Volt == "2") {
    RateOn = 5.7982;
    RateOff = 2.6369;

    let year = $("#ddlYear").val();
    Service = 38.22;
    if (year > 2565) Service = 24.62;
  }

  let IsCheaper = true;

  //Base
  var _Power = Round(_Peak * RateOn + _OffPeak * RateOff + _Holiday * RateOff);
  var _Base = Round(_Power + Service);
  var _FT = Round((_Peak + _OffPeak + _Holiday) * (FT_Now / 100));
  var _VAT = Round((_Base + _FT) * nowVAT);
  var SummaryBase = _Base + _FT;

  //Now
  var Power = Round(Peak * RateOn + OffPeak * RateOff + Holiday * RateOff);
  var Base = Round(Power + Service);
  var FT = Round((Peak + OffPeak + Holiday) * (FT_Now / 100));
  var VAT = Round((Base + FT) * nowVAT);
  var Summary = Base + FT + VAT;

  if (SummaryBase > Summary) {
    IsCheaper = false;
  }

  return IsCheaper;
}

function Calculate01_TOU() {

  const FT_Now = GetFT();
  const Volt = $("#ddlVolt").val();
  const Peak = parseInt($("#txtPeak").autoNumeric("get"));
  const OffPeak = parseInt($("#txtOffPeak").autoNumeric("get"));
  const Holiday = parseInt($("#txtHoliday").autoNumeric("get"));

  // Covid-19 Discount Base (FEB 63)
  let _Peak = parseInt($("#txtDiscount_Peak").autoNumeric("get"));
  let _OffPeak = parseInt($("#txtDiscount_OffPeak").autoNumeric("get"));
  const _Holiday = parseInt($("#txtDiscount_Holiday").autoNumeric("get"));
  const _Unit = parseInt($("#txtDiscountTOU_Unit").autoNumeric("get"));

  let rdDiscountTOU = $("input[name='rdDiscountTOU']:checked").val()
  console.log(rdDiscountTOU);
  if (rdDiscountTOU == "RateNormal") {
    let SumUnit = Peak + OffPeak + Holiday; //1000
    if (SumUnit > 0) {
      _Peak = _Unit * (Peak / SumUnit);
      _OffPeak = _Unit * ((OffPeak + Holiday) / SumUnit);

    }
  }

  let RateOn = 0.0;
  let RateOff = 0.0;
  let Service = 0.0;

  // Volt 1 : แรงดัน 22-33 kV || Volt 2 : แรงดันต่ำกว่า 22 kV
  if (Volt == "1") {
    RateOn = 5.1135;
    RateOff = 2.6037;
    Service = 312.24;
  } else if (Volt == "2") {
    RateOn = 5.7982;
    RateOff = 2.6369;

    let year = $("#ddlYear").val();
    Service = 38.22;
    if (year > 2565) Service = 24.62;
  }

  if (IsDiscount_BaseFEB()) {
    let SummaryUnit = Peak + OffPeak + Holiday;
    let SummaryUnitBase = _Peak + _OffPeak + _Holiday;

    if (SummaryUnit <= SummaryUnitBase) {
      //เช็คเคสใช้ไฟน้อยกว่าหน่วยฐาน แต่ค่าไฟหน่วยฐานถูกว่า (ก่อน VAT) ให้คำนวณด้วยหน่วยฐาน
      if (IsBaseCheaper()) {
        var _Power = Round(
          _Peak * RateOn + _OffPeak * RateOff + _Holiday * RateOff
        );
        var _Base = Round(_Power + Service);
        var _FT = Round((_Peak + _OffPeak + _Holiday) * (FT_Now / 100));
        var _VAT = Round((_Base + _FT) * nowVAT);
        var SummaryBase = _Base + _FT + _VAT;
        $("#txtResultPower").autoNumeric("set", _Power);
        $("#txtResultService").autoNumeric("set", Service);
        $("#txtResultBase").autoNumeric("set", _Base);
        $("#txtResultFT").autoNumeric("set", _FT);
        $("#txtResultVat").autoNumeric("set", _VAT);
        $("#txtResultSummary").autoNumeric("set", SummaryBase);

        if (IsDiscount_3Percent()) {
          $(".covid-19").css("display", "");
          var Discount_3Percent = SummaryBase * 0.03;
          var AfterDiscount_3Percent = SummaryBase - Discount_3Percent;
          $("#pnlDiscount").css("display", "");
          $("#txtDiscount").autoNumeric("set", Discount_3Percent);
          $("#txtAfterDiscount").autoNumeric("set", AfterDiscount_3Percent);
        } else {
          $("#pnlDiscount").css("display", "none");
        }
      } else {
        var Power = Round(
          Peak * RateOn + OffPeak * RateOff + Holiday * RateOff
        );
        var Base = Round(Power + Service);
        var FT = Round((Peak + OffPeak + Holiday) * (FT_Now / 100));
        var VAT = Round((Base + FT) * nowVAT);
        var Summary = Base + FT + VAT;
        $("#txtResultPower").autoNumeric("set", Power);
        $("#txtResultService").autoNumeric("set", Service);
        $("#txtResultBase").autoNumeric("set", Base);
        $("#txtResultFT").autoNumeric("set", FT);
        $("#txtResultVat").autoNumeric("set", VAT);
        $("#txtResultSummary").autoNumeric("set", Summary);

        if (IsDiscount_3Percent()) {
          $(".covid-19").css("display", "");
          var Discount_3Percent = Summary * 0.03;
          var AfterDiscount_3Percent = Summary - Discount_3Percent;
          $("#pnlDiscount").css("display", "");
          $("#txtDiscount").autoNumeric("set", Discount_3Percent);
          $("#txtAfterDiscount").autoNumeric("set", AfterDiscount_3Percent);
        } else {
          $("#pnlDiscount").css("display", "none");
        }
      }
    } else if (SummaryUnit > SummaryUnitBase) {
      if (SummaryUnit < 801) {
        // หน่วยไฟฟ้าใช้มากกว่าหน่วยฐาน โดยไม่เกิน 800 หน่วย > ให้จ่ายค่าไฟเท่ากับหน่วยฐาน
        var _Power = Round(
          _Peak * RateOn + _OffPeak * RateOff + _Holiday * RateOff
        );
        var _Base = Round(_Power + Service);
        var _FT = Round((_Peak + _OffPeak + _Holiday) * (FT_Now / 100));
        var _VAT = Round((_Base + _FT) * nowVAT);
        var SummaryBase = _Base + _FT + _VAT;
        $("#txtResultPower").autoNumeric("set", _Power);
        $("#txtResultService").autoNumeric("set", Service);
        $("#txtResultBase").autoNumeric("set", _Base);
        $("#txtResultFT").autoNumeric("set", _FT);
        $("#txtResultVat").autoNumeric("set", _VAT);
        $("#txtResultSummary").autoNumeric("set", SummaryBase);

        if (IsDiscount_3Percent()) {
          $(".covid-19").css("display", "");
          var Discount_3Percent = SummaryBase * 0.03;
          var AfterDiscount_3Percent = SummaryBase - Discount_3Percent;
          $("#pnlDiscount").css("display", "");
          $("#txtDiscount").autoNumeric("set", Discount_3Percent);
          $("#txtAfterDiscount").autoNumeric("set", AfterDiscount_3Percent);
        } else {
          $("#pnlDiscount").css("display", "none");
        }
      } else if (SummaryUnit > 800 && SummaryUnit < 3001) {
        //หน่วยไฟฟ้าใช้มากกว่าหน่วยฐาน มากกว่า 800 หน่วย แต่ไม่เกิน 3000 หน่วย > ให้จ่ายเท่าหน่วยฐาน + 50% ของส่วนที่เกิน
        let MoreThanBase05 = (SummaryUnit - SummaryUnitBase) * 0.5;
        let MoreThan_Peak = MoreThanBase05 * (Peak / SummaryUnit);
        let MoreThan_offPeak =
          MoreThanBase05 * ((OffPeak + Holiday) / SummaryUnit);

        let CalPeak = Math.round(_Peak + MoreThan_Peak);
        let CalOffPeak = Math.round(_OffPeak + _Holiday + MoreThan_offPeak);
        let _Power = Round(CalPeak * RateOn + CalOffPeak * RateOff);
        let _Base = Round(_Power + Service);
        let _FT = Round((CalPeak + CalOffPeak) * (FT_Now / 100));
        let _VAT = Round((_Base + _FT) * nowVAT);
        let SummaryCal = _Base + _FT + _VAT;

        $("#txtResultPower").autoNumeric("set", _Power);
        $("#txtResultService").autoNumeric("set", Service);
        $("#txtResultBase").autoNumeric("set", _Base);
        $("#txtResultFT").autoNumeric("set", _FT);
        $("#txtResultVat").autoNumeric("set", _VAT);
        $("#txtResultSummary").autoNumeric("set", SummaryCal);

        if (IsDiscount_3Percent()) {
          $(".covid-19").css("display", "");
          var Discount_3Percent = SummaryCal * 0.03;
          var AfterDiscount_3Percent = SummaryCal - Discount_3Percent;
          $("#pnlDiscount").css("display", "");
          $("#txtDiscount").autoNumeric("set", Discount_3Percent);
          $("#txtAfterDiscount").autoNumeric("set", AfterDiscount_3Percent);
        } else {
          $("#pnlDiscount").css("display", "none");
        }
      } else if (SummaryUnit > 3000) {
        //หน่วยไฟฟ้าใช้มากกว่าหน่วยฐาน มากกว่า 3000 หน่วย > ให้จ่ายเท่าหน่วยฐาน + 70% ของส่วนที่เกิน
        let MoreThanBase07 = (SummaryUnit - SummaryUnitBase) * 0.7;
        let MoreThan_Peak = MoreThanBase07 * (Peak / SummaryUnit);
        let MoreThan_offPeak =
          MoreThanBase07 * ((OffPeak + Holiday) / SummaryUnit);

        let CalPeak = Math.round(_Peak + MoreThan_Peak);
        let CalOffPeak = Math.round(_OffPeak + _Holiday + MoreThan_offPeak);
        let _Power = Round(CalPeak * RateOn + CalOffPeak * RateOff);
        let _Base = Round(_Power + Service);
        let _FT = Round((CalPeak + CalOffPeak) * (FT_Now / 100));
        let _VAT = Round((_Base + _FT) * nowVAT);
        let SummaryCal = _Base + _FT + _VAT;

        $("#txtResultPower").autoNumeric("set", _Power);
        $("#txtResultService").autoNumeric("set", Service);
        $("#txtResultBase").autoNumeric("set", _Base);
        $("#txtResultFT").autoNumeric("set", _FT);
        $("#txtResultVat").autoNumeric("set", _VAT);
        $("#txtResultSummary").autoNumeric("set", SummaryCal);

        if (IsDiscount_3Percent()) {
          $(".covid-19").css("display", "");
          var Discount_3Percent = SummaryCal * 0.03;
          var AfterDiscount_3Percent = SummaryCal - Discount_3Percent;
          $("#pnlDiscount").css("display", "");
          $("#txtDiscount").autoNumeric("set", Discount_3Percent);
          $("#txtAfterDiscount").autoNumeric("set", AfterDiscount_3Percent);
        } else {
          $("#pnlDiscount").css("display", "none");
        }
      }
    }
  } else {
    //=ROUND(IF(C4=2,(C6* C13) + (C7 * D13)+(C8*D13), (C6 * C12) + (C7 * D12)+(C8*D12)),2)
    var Power = Round(Peak * RateOn + OffPeak * RateOff + Holiday * RateOff);
    var Base = Round(Power + Service);
    var FT = Round((Peak + OffPeak + Holiday) * (FT_Now / 100)); //=ROUND((C6+C7+C8)*C9/100,2)
    var VAT = Round((Base + FT) * nowVAT); //=ROUND((E16+E18)*0.07,2)
    var Summary = Base + FT + VAT;

    $("#txtResultPower").autoNumeric("set", Power);
    $("#txtResultService").autoNumeric("set", Service);
    $("#txtResultBase").autoNumeric("set", Base);
    $("#txtResultFT").autoNumeric("set", FT);
    $("#txtResultVat").autoNumeric("set", VAT);
    $("#txtResultSummary").autoNumeric("set", Summary);

    if (IsDiscount_3Percent()) {
      $(".covid-19").css("display", "");
      var Discount_3Percent = Summary * 0.03;
      var AfterDiscount_3Percent = Summary - Discount_3Percent;
      $("#pnlDiscount").css("display", "");
      $("#txtDiscount").autoNumeric("set", Discount_3Percent);
      $("#txtAfterDiscount").autoNumeric("set", AfterDiscount_3Percent);
    } else {
      $("#pnlDiscount").css("display", "none");
    }
  }
}